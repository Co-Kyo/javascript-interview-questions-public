> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 04 手写 Promise

> 分类：JavaScript 核心手写 | 难度：⭐⭐⭐⭐ | 考察点：状态机、微任务、链式调用、异步执行机制

## 背景

`Promise` 是 JavaScript 异步编程的基石，理解其内部原理是掌握 `async/await` 的前提，也是前端面试的高频考点。手写 Promise 能综合考察候选人对**状态机模型**、**微任务调度**、**链式调用设计**以及**错误冒泡机制**的理解深度。

## 题目要求

请实现一个 `MyPromise` 类，具备以下能力：

### 1. 基础能力
- 构造函数接受 `executor(resolve, reject)` 回调
- 三种状态：`pending` → `fulfilled` / `rejected`，状态一旦变更不可逆转
- `then(onFulfilled, onRejected)` 支持链式调用，返回新的 `MyPromise`
- `catch(onRejected)` 作为 `.then(null, onRejected)` 的语法糖
- `finally(callback)` 无论成功失败都执行，不改变传递的值

### 2. 静态方法
- `MyPromise.resolve(value)` / `MyPromise.reject(reason)`
- `MyPromise.all(promises)` — 全部成功才 resolve，任一失败立即 reject
- `MyPromise.race(promises)` — 取第一个完成的结果
- `MyPromise.allSettled(promises)` — 等所有 Promise 完成，收集状态和值

### 3. 约束
- 使用 `setTimeout` 模拟微任务调度（保证 then 回调异步执行）
- 支持**状态不可逆**、**值穿透**、**thenable 解析**

## 示例

```javascript
// 链式调用
new MyPromise(r => setTimeout(() => r(1), 100))
  .then(v => v + 1)
  .then(v => new MyPromise(r => setTimeout(() => r(v * 10), 100)))
  .then(v => console.log(v));  // 20

// 错误捕获
new MyPromise((_, rej) => rej('err'))
  .catch(e => console.log(e));  // 'err'

// Promise.all
MyPromise.all([MyPromise.resolve(1), 2, Promise.resolve(3)])
  .then(v => console.log(v));  // [1, 2, 3]
```

## 实现分级

### 基础版（面试高频，建议优先掌握）
覆盖以下功能即可应对多数面试：
- 构造函数 + 三态管理（pending/fulfilled/rejected）
- then 方法 + 链式调用 + 值穿透
- catch / finally
- Promise.all / Promise.race
- 静态方法 resolve / reject

预计行数：80-120 行

### 完整 A+ 版（大厂高级岗位/take-home）
在基础版之上增加：
- thenable 解析（递归解析 thenable 对象）
- 循环引用检测（reject TypeError）
- Promise.allSettled
- resolvePromise 递归解析函数

预计行数：150-200 行

> 当前 solution.js 为完整 A+ 版。

## 评分标准

| 维度 | 优秀 | 合格 | 不合格 |
|------|------|------|--------|
| 状态机 | 三态完整 + 不可逆 | 能处理基本状态切换 | 缺少状态管理 |
| then 链式 | 返回新 Promise + 值穿透 | 能链式调用但缺值穿透 | 无法链式 |
| 异步调度 | setTimeout 模拟微任务 | 部分异步 | 全部同步 |
| 错误处理 | catch + 错误冒泡 | 有 catch | 无错误处理 |
| 静态方法 | all/race/resolve/reject | 有部分 | 无 |
