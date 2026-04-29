# Promise 串行执行器 - 五步讲解

## 第一步：理解问题本质

**核心问题**：`Promise.all(tasks.map(fn))` 是并发执行的，无法保证顺序。

```
❌ 并发：三个请求同时发出，谁先回来不确定
Promise.all([fetch('/a'), fetch('/b'), fetch('/c')])

✅ 串行：a 完成后才发 b，b 完成后才发 c
serial([() => fetch('/a'), () => fetch('/b'), () => fetch('/c')])
```

**为什么 tasks 是函数数组而非 Promise 数组？**

❌ 错误：传入时 Promise 就已经开始执行了，无法控制顺序

```
const tasks = [fetch('/a'), fetch('/b'), fetch('/c')];
```

✅ 正确：传入函数，调用时才创建 Promise，执行时机可控

```
const tasks = [() => fetch('/a'), () => fetch('/b'), () => fetch('/c')];
```

这是一个经典的**惰性求值**设计：函数是"任务的描述"，调用函数才是"任务的执行"。

---

## 第二步：理解 reduce 串联 Promise 的原理

`reduce` 的回调接收两个关键参数：

```
tasks.reduce((chain, task) => ..., Promise.resolve([]))
      ↑          ↑              ↑
   累加器     当前元素        初始值
```

**reduce 在这里的作用**：把 `[task1, task2, task3]` 从左到右"折叠"成一条 Promise 链：

```
初始值:  Promise.resolve([])

第1轮:   chain.then((results) => task1().then(result => [...results, result]))
         ↑ results=[]                ↑ result='A'       → Promise<['A']>

第2轮:   chain.then((results) => task2().then(result => [...results, result]))
         ↑ results=['A']             ↑ result='B'       → Promise<['A', 'B']>

第3轮:   chain.then((results) => task3().then(result => [...results, result]))
         ↑ results=['A','B']         ↑ result='C'       → Promise<['A', 'B', 'C']>
```

每次迭代，`chain` 都是"到目前为止已完成的 Promise 链"，`.then()` 把新任务接在链尾。注意 `results` 参数如何从上一轮的返回值传递到下一轮。

---

## 第三步：逐步实现

### 3.1 serial（基础版）

```javascript
function serial(tasks) {
  return tasks.reduce(
    (chain, task) => {
      return chain.then((results) => {
        return task().then((result) => [...results, result]);
      });
    },
    Promise.resolve([])
  );
}
```

**`chain.then((results) => ...)`**：此时前序任务已完成，`results` 是已收集的结果数组。

**`task().then((result) => ...)`**：调用函数创建 Promise，`.then()` 拿到它的结果。必须 `return` 这个 Promise，否则链会断裂——`.then()` 会立即 resolve，不等任务完成。

**`[...results, result]`**：不可变写法，每次生成新数组（追加当前结果），作为下一个 `.then()` 的 `results`。

**`Promise.resolve([])`**：链的起点。reduce 的累加器 `chain` 在第一轮就需要调用 `.then()`，如果初始值是普通数组 `[]`，`[].then(...)` 会报错。必须用 `Promise.resolve([])` 确保累加器始终是 Promise。

### 3.2 serialOptimized（优化版）

```javascript
function serialOptimized(tasks) {
  const results = [];

  return tasks
    .reduce((chain, task) => {
      return chain.then(() => {
        return task().then((result) => {
          results.push(result);
        });
      });
    }, Promise.resolve())
    .then(() => results);
}
```

**`const results = []`**：外部可变数组，避免每次 `[...results, result]` 的拷贝开销。

**`results.push(result)`**：直接 push 到外部数组，O(1) 操作，而基础版的 `[...results, result]` 每次都是 O(n) 拷贝，整体退化为 O(n²)。

**`.then(() => results)`**：链结束后才返回收集的结果。因为 `reduce` 的回调不再返回新数组，需要在链尾统一返回。

**两版对比**：

| | 基础版 | 优化版 |
|---|---|---|
| 数组操作 | `[...arr, item]` (拷贝) | `arr.push(item)` (原地) |
| 时间复杂度 | O(n²) | O(n) |
| 函数式风格 | ✅ 纯函数 | ❌ 有副作用 |
| reduce 初始值 | `Promise.resolve([])` | `Promise.resolve()` |
| 最终返回 | reduce 直接返回结果 | 需额外 `.then(() => results)` |

---

## 第四步：常见追问

### Q1：如何处理错误？

**方案 A**：任一任务失败则整体 reject（默认行为）

```javascript
serial([task1, brokenTask, task3])
  .catch(err => console.error('串行中断:', err));
```

**方案 B**：收集所有结果（成功/失败），不中断执行

```javascript
function serialAll(tasks) {
  return tasks.reduce(
    (chain, task) => chain.then((results) =>
      task()
        .then(result => [...results, { status: 'fulfilled', value: result }])
        .catch(err   => [...results, { status: 'rejected',  reason: err }])
    ),
    Promise.resolve([])
  );
}
```

### Q2：如何实现 concurrency 限制（并发控制）？

串行是并发数 = 1 的特例。通用的并发控制需要维护一个"执行池"：

```javascript
function concurrency(tasks, limit = 3) {
}
```

串行等价于 `concurrency(1)`，`Promise.all` 等价于 `concurrency(Infinity)`。内部用队列 + 计数器实现。

### Q3：async/await 版本对比

```javascript
async function serialAsync(tasks) {
  const results = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
}
```

reduce 版本本质上是把 `for...of + await` 展开成了 `.then()` 链——理解了这层关系，两种写法就能自由切换。面试中通常要求 reduce 版本，但提到 async/await 版本是加分项。

### Q4：reduce 的初始值为什么是 `Promise.resolve([])` 而非 `[]`？

因为 reduce 的累加器 `chain` 在第一轮就需要调用 `.then()`。如果初始值是普通数组 `[]`，第一轮 `[].then(...)` 会报错——数组没有 `.then()` 方法。必须用 `Promise.resolve([])` 确保累加器始终是 Promise。

---

## 第五步：易错点

| 易错点 | 说明 |
|-------|------|
| 忘记 return task() 的 Promise | `.then()` 会立即 resolve，不等任务完成，链断裂 |
| reduce 初始值写成 `[]` | `[].then(...)` → TypeError |
| 传入 Promise 而非函数 | Promise 在传入时就已开始执行，无法控制顺序 |
| 忘记处理空数组 | 空数组 reduce 直接返回初始值，需确保初始值类型正确 |
| 未处理 reject | 任务 reject 时链会中断，后续任务不执行 |