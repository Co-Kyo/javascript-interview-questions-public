# 09 - 并发控制器 详解

## 五步讲解

---

### 第一步：理解问题本质

并发控制器的核心是一个 **生产者-消费者模型**：

- **生产者**：调用 `add(task)` 的代码，不断往队列里添加任务
- **消费者**：调度器，最多同时消费 `max` 个任务
- **缓冲区**：等待队列，存放尚未执行的任务

关键约束：
- 同时运行的任务数 **永远不超过 max**
- 任务按 **先进先出（FIFO）** 顺序执行
- 每个任务完成后，**自动** 从队列取下一个任务补位

---

### 第二步：设计数据结构

```javascript
class Scheduler {
  constructor(max) {
    this.max = max;           // 最大并发数（固定值）
    this.runningCount = 0;    // 当前正在运行的任务数（动态变化）
    this.queue = [];          // 等待队列
  }
}
```

三个核心属性：
| 属性 | 作用 | 变化时机 |
|------|------|---------|
| `max` | 并发上限 | 构造时确定，不变 |
| `runningCount` | 当前并发数 | 任务开始+1，完成-1 |
| `queue` | 等待队列 | add 时入队，执行时出队 |

**为什么 queue 里要存 resolve/reject？**

因为 `add()` 返回了一个 Promise 给调用方，我们需要在任务真正完成时才 resolve 这个 Promise。把 resolve/reject 和 task 绑在一起存入队列，任务执行完后就能直接调用对应的 resolve/reject。

---

### 第三步：实现 add 方法

```javascript
add(task) {
  return new Promise((resolve, reject) => {
    // 1. 把任务（及其对应的 resolve/reject）入队
    this.queue.push({ task, resolve, reject });

    // 2. 尝试调度执行
    this._run();
  });
}
```

`add()` 的返回值是一个 Promise，它不会立即 resolve，而是等到对应的任务真正执行完毕后才 resolve。

**设计要点**：通过 `new Promise` 包装，把 Promise 的控制权（resolve/reject）"移交"给调度器，由调度器在合适的时机调用。

---

### 第四步：实现核心调度逻辑 _run

```javascript
_run() {
  // 循环条件：有空闲槽位 且 队列不为空
  while (this.runningCount < this.max && this.queue.length > 0) {
    // 1. 从队头取出任务（FIFO）
    const { task, resolve, reject } = this.queue.shift();

    // 2. 运行计数 +1
    this.runningCount++;

    // 3. 执行任务
    task()
      .then(result => resolve(result))    // 成功 → resolve
      .catch(error => reject(error))      // 失败 → reject（不阻塞后续任务）
      .finally(() => {
        this.runningCount--;              // 4. 释放槽位
        this._run();                      // 5. 递归调度下一个任务
      });
  }
}
```

**为什么用 `while` 而不是 `if`？**

因为 `add()` 可能在一次事件循环中被连续调用多次（如 `add(task1); add(task2); add(task3)`），用 `while` 可以一次性填满所有空闲槽位，而不是每次只调度一个。

**为什么用 `finally` 而不是在 `.then` 和 `.catch` 里分别减计数？**

`finally` 无论成功失败都会执行，保证 `runningCount` 一定会被减回去，不会出现"任务失败导致计数泄漏、槽位越来越少"的 bug。

**错误隔离**：某个任务 reject 不会影响其他任务，因为 `_run()` 在 `finally` 里被调用，确保后续任务正常调度。

---

### 第五步：理解执行时序

以 `max=2`、4 个任务为例，画出完整的执行流程：

```
时间轴 (ms)
  0    300   500   800   1000  1400
  |-----|-----|-----|-----|-----|

槽位1: [===任务1 (1000ms)===]       [===任务4 (400ms)===]
槽位2: [==任务2 (500ms)==] [任务3 (300ms)]
队列:  [3, 4]               [4]     []                   []
```

逐步追踪：

| 时刻 | 事件 | runningCount | queue | 说明 |
|------|------|:-----------:|-------|------|
| 0ms | add(task1) | 1→2 | [] | task1 立即执行 |
| 0ms | add(task2) | 2 | [] | task2 立即执行（槽位2空闲） |
| 0ms | add(task3) | 2 | [task3] | 满载，task3 入队 |
| 0ms | add(task4) | 2 | [task3, task4] | 满载，task4 入队 |
| 500ms | task2 完成 | 2→1→2 | [task4] | 释放槽位，task3 补上 |
| 800ms | task3 完成 | 2→1 | [] | 释放槽位，队列空 |
| 1000ms | task1 完成 | 1→0→1 | [] | 释放槽位，task4 补上 |
| 1400ms | task4 完成 | 1→0 | [] | 全部完成 |

---

## 常见面试追问

### Q0: 为什么要校验 max 和 task 参数？

**防御性编程**是手写题的加分项。面试官期望你不只是写出"能跑"的代码，还要考虑异常输入：

```javascript
constructor(max) {
  if (!Number.isInteger(max) || max < 1) {
    throw new RangeError(`max 必须为正整数，收到: ${max}`);
  }
  // ...
}

add(task) {
  if (typeof task !== 'function') {
    return Promise.reject(new TypeError(`task 必须是函数，收到: ${typeof task}`));
  }
  // ...
}
```

- `max = 0` → 队列永远不消费，所有 Promise 永远 pending（静默失败）
- `max = -1` → `while` 条件恒假，同样静默失败
- `task = null` → `task()` 抛 TypeError，但错误信息不够友好

**注意**：`constructor` 中抛同步异常，`add` 中返回 reject 的 Promise —— 这是符合各自调用习惯的正确选择。

### Q1: 为什么不用 async/await 实现？

可以用，但 Promise 链式调用更直观地展示了"任务完成后触发下一个"的机制。async/await 版本需要额外维护循环或递归，代码不一定更简洁。

### Q2: 如何支持动态调整 max？

```javascript
// 在 Scheduler 上增加方法
updateMax(newMax) {
  this.max = newMax;
  this._run(); // 新槽位可能空出来了，尝试调度
}
```

### Q3: 如何实现取消功能？

可以在队列项中加一个 `cancelled` 标记，在 `_run` 中检查：

```javascript
add(task) {
  return new Promise((resolve, reject) => {
    const item = { task, resolve, reject, cancelled: false };
    this.queue.push(item);
    this._run();

    // 返回取消函数
    item.cancel = () => {
      item.cancelled = true;
      resolve(undefined); // 或 reject 一个 CancelError
    };
  });
}
```

### Q4: 与 p-limit 的区别？

`p-limit` 是社区成熟库，内部实现原理类似（也是维护一个活跃 Promise 计数 + 等待队列）。面试要求手写是为了考察对 Promise 调度机制的理解，而不是考察是否知道这个库。
