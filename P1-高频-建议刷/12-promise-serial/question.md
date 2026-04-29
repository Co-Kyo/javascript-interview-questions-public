> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# Promise 串行执行器

## 分类
异步与并发控制

## 难度
⭐⭐

## 考察点
- `Array.prototype.reduce` 的高级用法
- Promise 链式调用与异步流程控制
- 闭包与累加器模式

## 背景

在实际开发中，很多场景需要 Promise **严格按顺序依次执行**，而非并发：

- **数据库迁移**：每一步迁移依赖上一步的结果
- **接口依赖调用**：先获取 token，再用 token 请求用户信息，再请求用户权限
- **批量操作**：写入多个文件时需保证顺序，避免竞态
- **限流/节流**：逐个请求以避免触发 API 速率限制

`Promise.all` 会并发执行所有任务，无法满足"前一个完成后再执行下一个"的需求。

## 题目

实现 `serial(tasks)` 函数：

### 参数
- `tasks`：一个数组，每个元素是一个**函数**（不是 Promise 本身），调用后返回 Promise

### 返回值
- 返回一个 Promise，resolve 为**所有任务结果的数组**，顺序与 tasks 一致

### 要求
1. 按顺序依次执行每个任务，前一个完成后再执行下一个
2. 收集每个任务的返回值，最终以数组形式返回
3. 使用 `reduce` 实现 Promise 链的串联
4. 任务是函数而非 Promise，确保执行时机可控

### 示例

```javascript
// 模拟异步任务
const task1 = () => new Promise(resolve => setTimeout(() => resolve('结果1'), 100));
const task2 = () => new Promise(resolve => setTimeout(() => resolve('结果2'), 200));
const task3 = () => new Promise(resolve => setTimeout(() => resolve('结果3'), 50));

serial([task1, task2, task3]).then(results => {
  console.log(results); // ['结果1', '结果2', '结果3']
  // 注意：虽然 task3 最快，但它必须等 task1、task2 都完成后才执行
});
```

### 实际场景示例

```javascript
// 依次调用有依赖关系的接口
const tasks = [
  () => fetch('/api/login').then(r => r.json()),       // 获取 token
  () => fetch('/api/user').then(r => r.json()),         // 用 token 获取用户信息
  () => fetch('/api/permissions').then(r => r.json()),   // 用用户信息获取权限
];

serial(tasks).then(([loginRes, userRes, permRes]) => {
  console.log('全部完成', loginRes, userRes, permRes);
});
```

### 边界场景

```javascript
// 1. 空数组 → 立即 resolve 为空数组
serial([]).then(results => {
  console.log(results); // []
});

// 2. 单个任务 → 返回只有一个元素的数组
serial([() => Promise.resolve('only')]).then(results => {
  console.log(results); // ['only']
});

// 3. 某个任务 reject → 整条链中断，后续任务不执行
const task1 = () => Promise.resolve('ok');
const task2 = () => Promise.reject(new Error('fail'));
const task3 = () => Promise.resolve('never runs');

serial([task1, task2, task3])
  .catch(err => console.error(err.message)); // 'fail'
```

## 约束
- 不使用 `async/await`（面试要求用 reduce 原始方式实现）
- 不使用 `for` 循环
- 必须使用 `reduce` 串联 Promise 链

## 评分标准
| 层级 | 要求 |
|------|------|
| 及格 | 能用 reduce 实现顺序执行 |
| 良好 | 能正确收集所有任务结果，处理空数组边界 |
| 优秀 | 理解任务是函数而非 Promise 的设计原因，能解释 reduce 初始值的作用，能说明 reject 时的行为 |
