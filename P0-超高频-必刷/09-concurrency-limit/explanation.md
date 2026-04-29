# 09 - 并发控制器 详解

---

### 第一步：理解问题本质

并发控制器的核心是一个 **生产者-消费者模型**：

- **生产者**：调用 `add(task)` 的代码，不断往队列里添加任务
- **消费者**：调度器，最多同时消费 `max` 个任务
- **缓冲区**：等待队列，存放尚未执行的任务

关键约束：同时运行的任务数永远不超过 max；任务按先进先出（FIFO）顺序执行；每个任务完成后自动从队列取下一个任务补位。

---

### 第二步：设计数据结构

```javascript
class Scheduler {
  constructor(max) {
    this.max = max;
    this.runningCount = 0;
    this.queue = [];
  }
}
```

三个核心属性：`max` 是并发上限，构造时确定不变；`runningCount` 是当前并发数，任务开始 +1 完成 -1；`queue` 是等待队列，add 时入队执行时出队。

**为什么 queue 里要存 resolve/reject？** 因为 `add()` 返回了一个 Promise 给调用方，我们需要在任务真正完成时才 resolve 这个 Promise。把 resolve/reject 和 task 绑在一起存入队列，任务执行完后就能直接调用对应的 resolve/reject。

---

### 第三步：实现 add 方法

```javascript
add(task) {
  return new Promise((resolve, reject) => {
    this.queue.push({ task, resolve, reject });
    this._run();
  });
}
```

`add()` 的返回值是一个 Promise，它不会立即 resolve，而是等到对应的任务真正执行完毕后才 resolve。通过 `new Promise` 包装，把 Promise 的控制权"移交"给调度器，由调度器在合适的时机调用。

---

### 第四步：实现核心调度逻辑 _run

```javascript
_run() {
  while (this.runningCount < this.max && this.queue.length > 0) {
    const { task, resolve, reject } = this.queue.shift();
    this.runningCount++;

    task()
      .then(result => resolve(result))
      .catch(error => reject(error))
      .finally(() => {
        this.runningCount--;
        this._run();
      });
  }
}
```

**为什么用 `while` 而不是 `if`？** 因为 `add()` 可能在一次事件循环中被连续调用多次，用 `while` 可以一次性填满所有空闲槽位。

**为什么用 `finally`？** `finally` 无论成功失败都会执行，保证 `runningCount` 一定会被减回去，不会出现"任务失败导致计数泄漏"的 bug。

**错误隔离**：某个任务 reject 不会影响其他任务，因为 `_run()` 在 `finally` 里被调用，确保后续任务正常调度。

---

### 第五步：理解执行时序

以 `max=2`、4 个任务为例：

```
时间轴 (ms)
  0    300   500   800   1000  1400
  |-----|-----|-----|-----|-----|

槽位1: [===任务1 (1000ms)===]       [===任务4 (400ms)===]
槽位2: [==任务2 (500ms)==] [任务3 (300ms)]
```

| 时刻 | 事件 | runningCount | queue | 说明 |
|------|------|:-----------:|-------|------|
| 0ms | add(task1) | 1 | [] | task1 立即执行 |
| 0ms | add(task2) | 2 | [] | task2 立即执行 |
| 0ms | add(task3) | 2 | [task3] | 满载，入队 |
| 0ms | add(task4) | 2 | [task3, task4] | 满载，入队 |
| 500ms | task2 完成 | 1→2 | [task4] | task3 补上 |
| 800ms | task3 完成 | 1 | [] | 释放槽位 |
| 1000ms | task1 完成 | 0→1 | [] | task4 补上 |
| 1400ms | task4 完成 | 0 | [] | 全部完成 |

---

## 常见面试追问

### Q1: 为什么不用 async/await 实现？

可以用，但 Promise 链式调用更直观地展示了"任务完成后触发下一个"的机制。

### Q2: 如何支持动态调整 max？

```javascript
updateMax(newMax) {
  this.max = newMax;
  this._run();
}
```

### Q3: 如何实现取消功能？

在队列项中加一个 `cancelled` 标记，在 `_run` 中检查。

### Q4: 与 p-limit 的区别？

`p-limit` 是社区成熟库，内部实现原理类似。面试要求手写是为了考察对 Promise 调度机制的理解。
