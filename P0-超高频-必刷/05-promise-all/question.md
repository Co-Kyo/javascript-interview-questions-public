> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 05 - 手写 Promise.all / allSettled / race

## 基本信息

- **分类**：JavaScript 核心手写
- **难度**：⭐⭐⭐
- **考察点**：并发控制、错误处理、Promise 组合

---

## 背景

在日常前端开发中，我们经常需要同时发起多个异步请求，然后根据不同的业务场景对结果进行汇总处理：

- **并行请求**：页面初始化时同时获取用户信息、权限配置、通知列表，全部返回后再渲染页面
- **批量操作**：用户勾选多条记录进行批量删除，需要等所有请求完成后统一提示结果
- **竞速场景**：从多个 CDN 节点拉取同一资源，取最快返回的那个

这正是 `Promise.all`、`Promise.allSettled`、`Promise.race` 的核心用途。

---

## 题目要求

请在 `Promise` 上实现以下三个静态方法，行为与原生保持一致：

### 1. `Promise.myAll(iterable)`

- 接收一个可迭代对象（通常为 Promise 数组）
- 当所有 Promise 都 fulfilled 时，返回一个新 Promise，其值为结果数组（顺序与入参一致）
- **只要有一个 Promise rejected，立即 reject**，返回第一个 rejection 的原因
- 如果传入空数组，立即 resolve 空数组
- 非 Promise 值需要包装为已 fulfilled 的 Promise

### 2. `Promise.myAllSettled(iterable)`

- 接收一个可迭代对象
- **等待所有 Promise 完成**（无论 fulfilled 还是 rejected）
- 返回结果数组，每个元素格式为：
  - 成功：`{ status: 'fulfilled', value: ... }`
  - 失败：`{ status: 'rejected', reason: ... }`
- 如果传入空数组，立即 resolve 空数组

### 3. `Promise.myRace(iterable)`

- 接收一个可迭代对象
- 返回**最先完成**（fulfilled 或 rejected）的 Promise 的结果
- 如果传入空数组，返回一个永远 pending 的 Promise

---

## 示例

### 示例 1：myAll 成功

```javascript
const p1 = Promise.resolve(1);
const p2 = new Promise(resolve => setTimeout(() => resolve(2), 100));
const p3 = Promise.resolve(3);

Promise.myAll([p1, p2, p3]).then(console.log);
// 输出: [1, 2, 3]
```

### 示例 2：myAll 有一个 reject

```javascript
const p1 = Promise.resolve(1);
const p2 = Promise.reject(new Error('fail'));
const p3 = new Promise(resolve => setTimeout(() => resolve(3), 200));

Promise.myAll([p1, p2, p3]).then(console.log, console.error);
// 输出: Error: fail
```

### 示例 3：myAll 空数组

```javascript
Promise.myAll([]).then(console.log);
// 输出: []
```

### 示例 4：myAllSettled 混合结果

```javascript
const p1 = Promise.resolve('ok');
const p2 = Promise.reject(new Error('fail'));
const p3 = Promise.resolve('good');

Promise.myAllSettled([p1, p2, p3]).then(console.log);
// 输出:
// [
//   { status: 'fulfilled', value: 'ok' },
//   { status: 'rejected', reason: Error: fail },
//   { status: 'fulfilled', value: 'good' }
// ]
```

### 示例 5：myRace 竞速

```javascript
const p1 = new Promise(resolve => setTimeout(() => resolve('slow'), 300));
const p2 = new Promise(resolve => setTimeout(() => resolve('fast'), 100));

Promise.myRace([p1, p2]).then(console.log);
// 输出: 'fast'
```

### 示例 6：myRace 空数组

```javascript
const p = Promise.myRace([]);
console.log(p); // Promise { <pending> } — 永远不会 resolve
```

### 示例 7：非 Promise 值自动包装

```javascript
Promise.myAll([1, Promise.resolve(2), 'three']).then(console.log);
// 输出: [1, 2, 'three']
// 普通值被 Promise.resolve() 自动包装为已 fulfilled 的 Promise
```

### 示例 8：thenable 对象

```javascript
Promise.myAll([
  { then: (resolve) => resolve(42) },
  Promise.resolve('ok'),
]).then(console.log);
// 输出: [42, 'ok']
// thenable 对象（有 .then 方法的对象）会被 Promise.resolve() 递归解析
```

---

## 约束

- 不得使用原生 `Promise.all`、`Promise.allSettled`、`Promise.race`（否则失去考察意义）
- `myAll` 一旦有 reject 必须立即返回，不要等其他 Promise 完成
- `myAllSettled` 必须等所有 Promise 完成后才返回
- 保持结果顺序与入参顺序一致（myAll / myAllSettled）
- 注意处理可迭代对象中的非 Promise 值

---

## 加分项（可选）

- 处理迭代器（不仅限于数组）
- 正确处理 thenable 对象
- 保证未完成的 Promise 的 rejection 不会泄漏（`myAll` 中后续 reject 不影响已 resolve 的结果）
