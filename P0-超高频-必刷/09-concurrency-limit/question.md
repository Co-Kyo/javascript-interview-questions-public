> 🔴 **优先级：P0（超高频）** — 字节原题，"被考烂了"

# 09 - 并发控制器（限制最大并发数）

> 分类：异步与并发控制 | 难度：⭐⭐⭐ | 考察点：Promise 池、任务调度、并发控制

## 背景

在前端开发中，批量上传图片、批量调用接口、批量下载文件等场景需要同时发起大量异步请求。如果不加限制，会遇到浏览器并发限制（同域名 ~6 个）、服务器过载、内存占用过高等问题。我们需要一个并发控制器，限制同时运行的异步任务数量。

## 题目要求

实现一个 `Scheduler` 类：

```javascript
class Scheduler {
  constructor(max) { /* max: 最大并发数 */ }
  add(task) { /* task: 返回 Promise 的函数 */ }
}
```

### 功能要求

1. `add(task)` 后，如果当前运行数 < `max`，立即执行；否则放入等待队列
2. `add` 返回一个 Promise，在对应任务完成时 resolve
3. 任务按添加顺序（FIFO）执行
4. 某个任务失败不应阻塞后续任务

### 示例

```javascript
const scheduler = new Scheduler(2);
const timeout = (time) => new Promise(r => setTimeout(r, time));

scheduler.add(() => timeout(1000)).then(() => console.log('任务1'));
scheduler.add(() => timeout(500)).then(() => console.log('任务2'));
scheduler.add(() => timeout(300)).then(() => console.log('任务3'));
scheduler.add(() => timeout(400)).then(() => console.log('任务4'));

// 输出顺序：任务2 → 任务3 → 任务1 → 任务4
```

## 约束条件

1. 不使用现成的并发控制库（如 `p-limit`、`p-queue`）
2. 需要正确处理错误情况（某任务失败不阻塞后续）
3. `max` 应为正整数，`task` 应为函数，不合法时应抛出有意义的错误
