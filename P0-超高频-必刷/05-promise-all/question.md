> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 05 - 手写 Promise.all / allSettled / race

> 分类：JavaScript 核心手写 | 难度：⭐⭐⭐ | 考察点：并发控制、错误处理、Promise 组合

## 背景

在日常前端开发中，我们经常需要同时发起多个异步请求：页面初始化时并行获取数据、批量操作后统一提示结果、从多个 CDN 节点竞速取资源。这正是 `Promise.all`、`Promise.allSettled`、`Promise.race` 的核心用途。

## 题目要求

请在 `Promise` 上实现以下三个静态方法，行为与原生保持一致：

### 1. `Promise.myAll(iterable)`

- 全部 fulfilled 时 resolve 结果数组（顺序与入参一致）
- 任一 rejected 立即 reject（短路）
- 空数组立即 resolve `[]`
- 非 Promise 值自动包装为已 fulfilled 的 Promise

### 2. `Promise.myAllSettled(iterable)`

- 等待所有 Promise 完成（无论 fulfilled 还是 rejected）
- 结果格式：成功 `{ status: 'fulfilled', value }`，失败 `{ status: 'rejected', reason }`
- 永远不会 reject

### 3. `Promise.myRace(iterable)`

- 返回最先完成（fulfilled 或 rejected）的结果
- 空数组返回永远 pending 的 Promise

## 示例

```javascript
// myAll
Promise.myAll([Promise.resolve(1), 2, Promise.resolve(3)])
  .then(console.log);  // [1, 2, 3]

// myAllSettled
Promise.myAllSettled([Promise.resolve('ok'), Promise.reject('fail')])
  .then(console.log);  // [{status:'fulfilled', value:'ok'}, {status:'rejected', reason:'fail'}]

// myRace
Promise.myRace([
  new Promise(r => setTimeout(() => r('slow'), 200)),
  new Promise(r => setTimeout(() => r('fast'), 50))
]).then(console.log);  // 'fast'
```

## 约束

- 不得使用原生 `Promise.all`、`Promise.allSettled`、`Promise.race`
- `myAll` 一旦有 reject 必须立即返回
- 保持结果顺序与入参一致（myAll / myAllSettled）
- 注意处理可迭代对象中的非 Promise 值
