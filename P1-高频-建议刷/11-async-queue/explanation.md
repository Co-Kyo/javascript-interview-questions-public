# 11 - 异步任务队列 ｜ 五步讲解

---

## 第一步：理解问题本质

**核心问题**：如何让异步任务"排队"执行？

JavaScript 的 Promise 本身是立即启动的，没有办法"延迟执行"。所以关键思路是：

> **不立即执行任务，而是把任务函数存起来，等轮到它时再调用。**

```
add(task) 的本质：
  task 不是 Promise，而是「返回 Promise 的函数」
  → 存入队列
  → 调度器在合适时机调用 task()
  → 拿到 Promise，链到执行流上
```

这是实现异步队列的**第一个关键设计决策**：传入的必须是函数而非 Promise。

---

## 第二步：串行执行的核心 —— Promise 链式调度

最简单的串行模型：

```js
let chain = Promise.resolve();

function add(task) {
  const p = chain.then(() => task());
  chain = p; // 更新链尾
  return p;
}
```

每次 `add` 都把新任务挂到链尾，形成：

```
task1 → task2 → task3 → ...
```

**但这种方式有缺陷**：
- 没有暂停/恢复能力
- 没有并发控制
- 链断裂（某任务失败）会影响后续任务

所以我们用更灵活的**调度器模式**替代。

---

## 第三步：调度器模式 —— 用 `_schedule()` 驱动执行

调度器的核心是一个 `while` 循环：

```js
_schedule() {
  while (未暂停 && 队列非空 && 有空闲槽位) {
    1. 从队列头部取一个任务
    2. 并发计数 +1
    3. 执行任务（调用 task()）
    4. 任务完成后：并发计数 -1，再次调用 _schedule()
  }
}
```

**为什么用 `while` 而不是 `if`？**

因为 `resume()` 调用时，可能有多个空位需要填充。`if` 只能启动一个任务，`while` 可以一次性填满所有空位。

**为什么用 `finally` 而不是分别在 `then/catch` 里调度？**

```js
task()
  .then(result => { /* 记录成功 */ })
  .catch(error => { /* 记录失败 */ })
  .finally(() => {
    this._running--;   // 释放槽位
    this._schedule();  // 继续调度
  });
```

`finally` 保证无论成功失败都会释放槽位，避免死锁。

> **注意**：`finally` 中的 `_schedule()` 不是同步递归 — 它在微任务队列中异步执行，不会导致栈溢出。每次任务完成 → 微任务调度 → 检查是否有新任务可启动。

---

## 第四步：理解 pause/resume 的实现

暂停和恢复的设计非常巧妙：

```js
pause() {
  this._paused = true;   // 仅设置标志
}

resume() {
  this._paused = false;  // 取消标志
  this._schedule();      // 触发调度
}
```

**关键点**：

1. **`pause()` 不中断正在执行的任务** — 正在运行的任务会自然完成
2. **暂停期间 `add()` 仍然有效** — 任务正常入队，只是不调度
3. **`resume()` 立即触发调度** — 如果有空位，马上开始执行等待的任务
4. **`_schedule()` 的 `while` 循环** — resume 时能一次性启动多个任务（填满并发槽位）

这就是一个简单的**状态机**：

```
         add()            _schedule()
  ┌───────────┐    ┌──────────────────┐
  │  队列等待  │───→│    正在执行       │
  └───────────┘    └──────────────────┘
       ↑                  │
       │  pause()         │ finally
       └──────────────────┘
```

---

## 第五步：add() 返回 Promise 的设计

每个 `add()` 调用返回一个独立的 Promise，与对应任务绑定：

```js
add(task) {
  return new Promise((resolve, reject) => {
    this._queue.push({ task, resolve, reject });
    this._schedule();
  });
}
```

当任务最终执行时：

```js
task()
  .then(value => {
    this._results.push({ status: 'fulfilled', value });
    resolve(value);   // ← 这里的 resolve 是 add() 里 new Promise 的 resolve
  })
  .catch(error => {
    this._results.push({ status: 'rejected', value: error });
    reject(error);    // ← 同理
  })
```

**闭包的力量**：`resolve` 和 `reject` 在 `add()` 时创建，通过闭包传递到 `_schedule()` 中，在任务完成时被调用。这样调用方可以：

```js
const result = await queue.add(task); // 直接拿到任务结果
```

---

## 总结：设计要点速查

| 设计点 | 方案 | 原因 |
|--------|------|------|
| 任务入参 | 函数（非 Promise） | 控制执行时机 |
| 调度方式 | `_schedule()` + while 循环 | 支持并发、支持 resume 批量启动 |
| 任务完成处理 | `finally` | 成功/失败都要释放槽位 |
| 暂停/恢复 | 布尔标志 + resume 时调用 _schedule | 简单可靠，不中断运行中任务 |
| 返回值绑定 | 闭包保存 resolve/reject | 每个 add 独立拿到结果 |
| 结果收集 | 独立 `_results` 数组 | 与任务调度解耦 |

> **并发模式下 `results` 的顺序**：串行模式中 results 按添加顺序排列（因为一次只运行一个）。并发模式中 results 按**实际完成顺序**排列 — 先完成的任务先出现在 results 中，与 add 顺序无关。

---

## 延伸思考

1. **任务取消**：如何支持 `queue.cancel(taskId)`？需要给每个任务分配 ID，并在调度时检查是否已取消。
2. **优先级队列**：如果某些任务需要优先执行，可以引入优先级排序。
3. **超时控制**：给每个任务设置最大执行时间，超时自动 reject。
4. **内存限制**：当队列过长时，如何优雅地拒绝新任务？

> **已实现**：`clear()` 清空等待队列、`destroy()` 销毁队列，见 solution.js。
