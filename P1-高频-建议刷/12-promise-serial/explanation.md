# Promise 串行执行器 - 五步讲解

## 第一步：理解问题本质

**核心问题**：`Promise.all(tasks.map(fn))` 是并发执行的，无法保证顺序。

```
// ❌ 并发：三个请求同时发出，谁先回来不确定
Promise.all([fetch('/a'), fetch('/b'), fetch('/c')])

// ✅ 串行：a 完成后才发 b，b 完成后才发 c
serial([() => fetch('/a'), () => fetch('/b'), () => fetch('/c')])
```

**为什么 tasks 是函数数组而非 Promise 数组？**

```javascript
// ❌ 错误：传入时 Promise 就已经开始执行了，无法控制顺序
const tasks = [fetch('/a'), fetch('/b'), fetch('/c')]; // 立即并发！

// ✅ 正确：传入函数，调用时才创建 Promise，执行时机可控
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

## 第三步：逐行解析代码

```javascript
function serial(tasks) {
  return tasks.reduce(
    (chain, task) => {
      return chain.then((results) => {
        // ↑ 此时前序任务已完成，results 是已收集的结果数组

        return task().then((result) => {
          // ↑ task() 返回 Promise，.then() 拿到它的结果
          //   注意：必须 return 这个 Promise，否则链会断裂

          return [...results, result];
          // ↑ 返回新数组（追加当前结果），作为下一个 .then() 的 results
        });
      });
    },
    Promise.resolve([]) // 链的起点：一个已 resolve 的 Promise，值为 []
  );
}
```

**关键细节**：
- `task()` 而非 `task`：调用函数才创建 Promise
- `return task().then(...)`：必须 return，否则 `.then()` 会立即 resolve，不等任务完成
- `[...results, result]`：不可变写法，每次生成新数组（面试中可讨论优化）

---

## （进阶）面试加分项：可变数组 vs 不可变数组优化

> 💡 **补充说明**：上面第二步和第三步是本题的核心——理解 `reduce` 如何串联 Promise 链。以下内容属于**可选的性能优化讨论**，面试中能提到是加分项，但不是必须掌握的核心步骤。

**基础版（不可变）**：每次 `[...results, result]` 创建新数组
- 优点：纯函数风格，无副作用
- 缺点：O(n²) 的数组拷贝开销

**优化版（可变）**：用外部 `results` 数组 + `push`

```javascript
function serialOptimized(tasks) {
  const results = [];  // 外部可变数组

  return tasks
    .reduce((chain, task) => {
      return chain.then(() => {
        return task().then((result) => {
          results.push(result);  // 直接 push，O(1)
        });
      });
    }, Promise.resolve())
    .then(() => results);  // 链结束后返回收集的结果
}
```

**区别**：
| | 基础版 | 优化版 |
|---|---|---|
| 数组操作 | `[...arr, item]` (拷贝) | `arr.push(item)` (原地) |
| 时间复杂度 | O(n²) | O(n) |
| 函数式风格 | ✅ 纯函数 | ❌ 有副作用 |
| reduce 初始值 | `Promise.resolve([])` | `Promise.resolve()` |
| 最终返回 | reduce 直接返回结果 | 需额外 `.then(() => results)` |

面试中两个版本都能写，**基础版更简洁优雅，优化版更注重性能**。

---

## 第五步：常见错误与追问延伸

### 常见错误

**错误 1：忘记 return task() 的 Promise**

```javascript
// ❌ 错误：没有 return，.then() 立即 resolve，不等任务完成
chain.then((results) => {
  task().then((result) => [...results, result]); // 没有 return！
});

// ✅ 正确：必须 return 内层 Promise
chain.then((results) => {
  return task().then((result) => [...results, result]);
});
```

**错误 2：reduce 初始值写成 `[]`**

```javascript
// ❌ 错误：[].then(...) → TypeError: [].then is not a function
tasks.reduce((chain, task) => chain.then(...), []);

// ✅ 正确：初始值必须是 Promise
tasks.reduce((chain, task) => chain.then(...), Promise.resolve([]));
```

**错误 3：传入 Promise 而非函数**

```javascript
// ❌ 错误：Promise 在传入时就已开始执行，无法控制顺序
serial([fetch('/a'), fetch('/b'), fetch('/c')]); // 立即并发！

// ✅ 正确：传入函数，调用时才创建 Promise
serial([() => fetch('/a'), () => fetch('/b'), () => fetch('/c')]);
```

---

### Q1：如何处理错误？

```javascript
// 方案 A：任一任务失败则整体 reject（默认行为）
serial([task1, brokenTask, task3])
  .catch(err => console.error('串行中断:', err));

// 方案 B：收集所有结果（成功/失败），不中断执行
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
// 串行 = concurrency(1)
// Promise.all = concurrency(Infinity)
function concurrency(tasks, limit = 3) {
  // 这是更高级的题目，通常用队列 + 计数器实现
}
```

### Q3：async/await 版本对比

```javascript
// async/await 版本（更直观，但面试要求 reduce 版本）
async function serialAsync(tasks) {
  const results = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
}
```

reduce 版本本质上是把 `for...of + await` 展开成了 `.then()` 链——理解了这层关系，两种写法就能自由切换。

### Q4：reduce 的初始值为什么是 `Promise.resolve([])` 而非 `[]`？

因为 reduce 的累加器 `chain` 在第一轮就需要调用 `.then()`。如果初始值是普通数组 `[]`，第一轮 `[].then(...)` 会报错——数组没有 `.then()` 方法。必须用 `Promise.resolve([])` 确保累加器始终是 Promise。
