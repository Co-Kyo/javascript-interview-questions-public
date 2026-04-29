> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# 11 - 异步任务队列（按顺序执行）

## 分类
异步与并发控制

## 难度
⭐⭐⭐

## 考察点
- 链式 Promise 的构建与管理
- 队列数据结构的实际应用
- 异步流程控制（串行执行）
- 状态机设计（运行/暂停）
- 闭包与回调的运用

---

## 背景

在前端开发中，许多场景需要按顺序执行异步任务：动画序列、数据处理流水线、API 请求编排、文件上传队列等。请实现一个通用的 `AsyncQueue` 类来解决这类问题。

---

## 题目要求

实现 `AsyncQueue` 类：

1. **`add(task)`** — 添加异步任务，`task` 是返回 `Promise` 的函数，按 `add` 调用顺序执行，返回的 Promise 在任务完成时 resolve
2. **并发数配置** — 构造函数支持 `concurrency` 参数（默认 1，严格串行）
3. **`pause()` / `resume()`** — 暂停/恢复队列（不中断运行中的任务）
4. **`clear()`** — 清空等待队列（被清空的任务以 rejected 状态完成）
5. **`destroy()`** — 销毁队列
6. **`results`** — 获取所有已完成任务的结果，格式 `{ status: 'fulfilled' | 'rejected', value: any }`

---

## 示例

```javascript
const queue = new AsyncQueue();
const r1 = await queue.add(() => Promise.resolve('结果1'));
const r2 = await queue.add(() => Promise.resolve('结果2'));
console.log(r1, r2); // '结果1' '结果2'
```

```javascript
const queue = new AsyncQueue({ concurrency: 2 });
// 最多同时运行 2 个任务，仍按 FIFO 顺序调度
```

---

## 约束

- 任务可能成功也可能失败，需要正确处理两种情况
- `add()` 返回的 Promise 必须与对应任务的结果绑定
- 暂停期间添加的任务不能丢失，恢复后要继续执行
- 并发数为正整数
- `results` 返回深拷贝，外部修改不影响内部状态
- 不使用第三方队列库
