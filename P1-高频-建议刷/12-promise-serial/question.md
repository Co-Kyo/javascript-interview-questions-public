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

`Promise.all` 会并发执行所有任务。但很多场景需要 Promise **严格按顺序依次执行**——数据库迁移、接口依赖调用（先 token → 再用户信息 → 再权限）、限流请求等。

## 题目

实现 `serial(tasks)` 函数：

- **参数**：`tasks` — 一个数组，每个元素是一个**函数**（不是 Promise 本身），调用后返回 Promise
- **返回值**：一个 Promise，resolve 为**所有任务结果的数组**，顺序与 tasks 一致
- **要求**：前一个完成后再执行下一个，收集每个任务的返回值

```javascript
const task1 = () => new Promise(resolve => setTimeout(() => resolve('结果1'), 100));
const task2 = () => new Promise(resolve => setTimeout(() => resolve('结果2'), 200));
const task3 = () => new Promise(resolve => setTimeout(() => resolve('结果3'), 50));

serial([task1, task2, task3]).then(results => {
  console.log(results); // ['结果1', '结果2', '结果3']
  // 虽然 task3 最快，但它必须等 task1、task2 都完成后才执行
});
```

## 约束
- 不使用 `async/await`（面试要求用 reduce 实现）
- 不使用 `for` 循环
- 必须使用 `reduce` 串联 Promise 链
- tasks 传入的是函数而非 Promise（惰性求值）

## 评分标准
| 层级 | 要求 |
|------|------|
| 及格 | 能用 reduce 实现顺序执行 |
| 良好 | 能正确收集所有任务结果，处理空数组边界 |
| 优秀 | 理解任务是函数而非 Promise 的设计原因，能解释 reduce 初始值的作用，能说明 reject 时的行为 |