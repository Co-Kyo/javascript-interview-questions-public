> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 04 手写 Promise

> 分类：JavaScript 核心手写 | 难度：⭐⭐⭐⭐ | 考察点：状态机、微任务、链式调用、异步执行机制

---

## 背景

`Promise` 是 JavaScript 异步编程的基石，理解其内部原理是掌握 `async/await` 的前提，也是前端面试的高频考点。手写 Promise 能综合考察候选人对**状态机模型**、**微任务调度**、**链式调用设计**以及**错误冒泡机制**的理解深度。

---

## 题目要求

请实现一个 `MyPromise` 类，具备以下能力：

### 1. 基础能力
- 构造函数接受 `executor(resolve, reject)` 回调
- 三种状态：`pending` → `fulfilled` / `rejected`，状态一旦变更不可逆转
- `then(onFulfilled, onRejected)` 支持链式调用，返回新的 `MyPromise`
- `catch(onRejected)` 作为 `.then(null, onRejected)` 的语法糖
- `finally(callback)` 无论成功失败都执行，不改变传递的值

### 2. 静态方法
- `MyPromise.resolve(value)` —— 将值包装为 fulfilled 的 Promise
- `MyPromise.reject(reason)` —— 将值包装为 rejected 的 Promise
- `MyPromise.all(promises)` —— 全部成功才 resolve，任一失败立即 reject
- `MyPromise.race(promises)` —— 取第一个完成（无论成功或失败）的结果
- `MyPromise.allSettled(promises)` —— 等所有 Promise 完成，收集每个的状态和值

### 3. 约束
- 使用 `setTimeout` 模拟微任务调度（保证 then 回调异步执行）
- 支持 **状态不可逆**：只有第一次 resolve/reject 生效
- 支持 **值穿透**：then 的参数如果不是函数，应当透传上一个 Promise 的结果
- 支持 **thenable 解析**：resolve 接收 thenable 对象时需递归解析

---

## 示例

```javascript
// 示例 1：基本异步 + 链式调用
const p = new MyPromise((resolve, reject) => {
  setTimeout(() => resolve(1), 100);
});

p.then(val => {
  console.log(val);        // 1
  return val + 1;
}).then(val => {
  console.log(val);        // 2
  return new MyPromise(resolve => setTimeout(() => resolve(val * 10), 100));
}).then(val => {
  console.log(val);        // 20
});

// 示例 2：错误捕获
new MyPromise((resolve, reject) => {
  reject('出错了');
}).catch(err => {
  console.log(err);        // '出错了'
  return '恢复';
}).then(val => {
  console.log(val);        // '恢复'
});

// 示例 3：MyPromise.all
MyPromise.all([
  MyPromise.resolve(1),
  new MyPromise(r => setTimeout(() => r(2), 50)),
  3
]).then(results => {
  console.log(results);    // [1, 2, 3]
});

// 示例 4：MyPromise.race
MyPromise.race([
  new MyPromise(r => setTimeout(() => r('慢'), 200)),
  new MyPromise(r => setTimeout(() => r('快'), 50))
]).then(val => {
  console.log(val);        // '快'
});
```

---

## 评分标准

| 维度 | 优秀 | 合格 | 不合格 |
|------|------|------|--------|
| 状态机 | 三态完整 + 不可逆 | 能处理基本状态切换 | 缺少状态管理 |
| then 链式 | 返回新 Promise + 值穿透 | 能链式调用但缺值穿透 | 无法链式 |
| 异步调度 | setTimeout 模拟微任务 | 部分异步 | 全部同步 |
| 错误处理 | catch + 错误冒泡 | 有 catch | 无错误处理 |
| 静态方法 | all/race/resolve/reject | 有部分 | 无 |

---

## 进阶追问（面试加分）

1. 如果 `then` 回调返回的是一个 `thenable` 对象（非 MyPromise 但有 then 方法），如何处理？
2. `MyPromise.all` 中如果某个 Promise 永远不 resolve，会发生什么？如何设置超时？
3. 为什么原生 Promise 的回调是在微任务队列执行，而不是宏任务（setTimeout）？两者的区别是什么？
4. 请解释 Promise/A+ 规范中对 `then` 返回值的递归解析（Resolution Procedure）。
