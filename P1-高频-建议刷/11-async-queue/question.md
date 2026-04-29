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

在前端开发中，许多场景需要按顺序执行异步任务：

- **动画序列**：多个动画需要依次播放，前一个完成后再启动下一个
- **数据处理流水线**：多步数据转换需要串行执行，每步依赖上一步的结果
- **API 请求编排**：多个接口调用有先后依赖关系
- **文件上传队列**：按顺序上传文件，避免并发导致的资源冲突

请实现一个通用的 `AsyncQueue` 类来解决这类问题。

---

## 题目要求

实现 `AsyncQueue` 类，具备以下能力：

### 核心功能

1. **`add(task)`** — 添加一个异步任务到队列
   - `task` 是一个返回 `Promise` 的函数
   - 按 `add` 的调用顺序依次执行
   - 返回一个 `Promise`，该 Promise 在对应任务完成时 resolve，值为任务的返回结果

2. **并发数配置** — 构造函数支持 `concurrency` 参数
   - `concurrency = 1`（默认）：严格串行，一个完成后才执行下一个
   - `concurrency > 1`：最多同时运行指定数量的任务，但仍按 FIFO 顺序调度

3. **`pause()`** — 暂停队列
   - 正在执行的任务继续完成，但不再启动新任务
   - 调用后 `add()` 仍可添加任务，只是暂不执行

4. **`resume()`** — 恢复队列
   - 继续执行队列中等待的任务

5. **`clear()`** — 清空等待队列
   - 不影响正在执行的任务
   - 被清空的等待任务以 rejected 状态完成

6. **`destroy()`** — 销毁队列
   - 清空等待任务 + 重置内部状态

7. **`results`** — 获取所有已完成任务的结果
   - 返回一个数组，按任务**完成顺序**排列（串行模式下等于添加顺序；并发模式下取决于实际完成先后）
   - 每个元素格式为 `{ status: 'fulfilled' | 'rejected', value: any }`

---

## 示例

### 基础串行示例

```js
const queue = new AsyncQueue();

const r1 = await queue.add(() => Promise.resolve('结果1'));
const r2 = await queue.add(() => Promise.resolve('结果2'));
console.log(r1, r2); // '结果1' '结果2'
console.log(queue.results);
// [{ status: 'fulfilled', value: '结果1' }, { status: 'fulfilled', value: '结果2' }]
```

### 完整异步示例

```js
const queue = new AsyncQueue({ concurrency: 1 });

// 模拟异步任务
const task1 = () => new Promise(r => setTimeout(() => r('结果1'), 300));
const task2 = () => new Promise(r => setTimeout(() => r('结果2'), 200));
const task3 = () => new Promise(r => setTimeout(() => r('结果3'), 100));

// 添加任务，按顺序依次执行
queue.add(task1); // 300ms 后完成
queue.add(task2); // task1 完成后开始，200ms 后完成
queue.add(task3); // task2 完成后开始，100ms 后完成

// 查看结果
setTimeout(() => {
  console.log(queue.results);
  // [
  //   { status: 'fulfilled', value: '结果1' },
  //   { status: 'fulfilled', value: '结果2' },
  //   { status: 'fulfilled', value: '结果3' }
  // ]
}, 700);
```

### 暂停/恢复示例

```js
const queue = new AsyncQueue();

queue.add(task1);
queue.pause();           // 暂停，task1 继续执行但 task2 不会启动
queue.add(task2);        // task2 进入等待队列
queue.add(task3);        // task3 进入等待队列

setTimeout(() => {
  queue.resume();        // 恢复，依次执行 task2, task3
}, 1000);
```

### 并发数示例

```js
const queue = new AsyncQueue({ concurrency: 2 });

const taskA = () => new Promise(r => setTimeout(() => r('A'), 300));
const taskB = () => new Promise(r => setTimeout(() => r('B'), 200));
const taskC = () => new Promise(r => setTimeout(() => r('C'), 100));
const taskD = () => new Promise(r => setTimeout(() => r('D'), 150));

// 最多同时运行 2 个任务
queue.add(taskA);  // 立即开始
queue.add(taskB);  // 立即开始（并发数=2）
queue.add(taskC);  // 等 taskA 或 taskB 完成后开始
queue.add(taskD);  // 等有空位后开始
```

---

## 约束

- 任务可能成功也可能失败（rejected），需要正确处理两种情况
- `add()` 返回的 Promise 必须与对应任务的结果绑定
- 暂停期间添加的任务不能丢失，恢复后要继续执行
- 并发数为正整数
- `results` 返回深拷贝，外部修改不影响内部状态
- 不使用第三方队列库

---

## 评分标准

| 等级 | 标准 |
|------|------|
| ⭐ 基础 | 能实现串行执行（concurrency=1），任务按顺序完成 |
| ⭐⭐ 进阶 | 正确处理任务失败、支持 pause/resume |
| ⭐⭐⭐ 完整 | 支持并发数配置、结果收集、错误隔离、返回值绑定、clear/destroy |
