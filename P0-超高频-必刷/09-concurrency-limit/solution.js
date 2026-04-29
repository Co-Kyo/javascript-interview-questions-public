/**
 * 并发控制器 - Scheduler
 * 限制同时运行的异步任务数量，任务按 FIFO 顺序调度
 */
class Scheduler {
  constructor(max) {
    if (!Number.isInteger(max) || max < 1) {
      throw new RangeError(`max 必须为正整数，收到: ${max}`);
    }
    this.max = max;           // 最大并发数
    this.runningCount = 0;    // 当前正在运行的任务数
    this.queue = [];          // 等待执行的任务队列，每项是 { task, resolve, reject }
  }

  /**
   * 添加异步任务
   * @param {Function} task - 返回 Promise 的任务函数
   * @returns {Promise} - 任务完成时 resolve，值为 task 的执行结果
   */
  add(task) {
    if (typeof task !== 'function') {
      return Promise.reject(new TypeError(`task 必须是函数，收到: ${typeof task}`));
    }
    return new Promise((resolve, reject) => {
      // 将任务及其对应的 resolve/reject 一起入队
      // 这样任务完成时，可以 resolve 调用方的 Promise
      this.queue.push({ task, resolve, reject });

      // 尝试调度执行
      this._run();
    });
  }

  /**
   * 内部调度方法：检查是否有空闲槽位，有则从队列取任务执行
   */
  _run() {
    // 没有空闲槽位 或 队列为空，不执行
    while (this.runningCount < this.max && this.queue.length > 0) {
      // 从队列头部取出一个任务（FIFO）
      const { task, resolve, reject } = this.queue.shift();

      // 运行计数 +1
      this.runningCount++;

      // 执行任务，无论成功失败都要：
      //   1. 运行计数 -1
      //   2. resolve/reject 调用方的 Promise
      //   3. 尝试调度下一个任务
      task()
        .then((result) => {
          resolve(result);       // 将结果传递给 add() 返回的 Promise
        })
        .catch((error) => {
          reject(error);         // 将错误传递给 add() 返回的 Promise
        })
        .finally(() => {
          this.runningCount--;   // 释放一个槽位
          this._run();           // 递归调度下一个等待中的任务
        });
    }
  }
}

// ============================================================
// 测试用例
// ============================================================

const timeout = (time) => new Promise((resolve) => setTimeout(resolve, time));

const scheduler = new Scheduler(2);

const addTask = (time, order) => {
  const start = Date.now();
  scheduler
    .add(() => timeout(time))
    .then(() => {
      const elapsed = Date.now() - start;
      console.log(`任务 ${order} 完成，耗时 ${elapsed}ms`);
    });
};

console.log("=== 基本测试 ===");
addTask(1000, 1); // 任务 1：1s
addTask(500, 2);  // 任务 2：0.5s
addTask(300, 3);  // 任务 3：等待任务2完成后执行
addTask(400, 4);  // 任务 4：等待任务1完成后执行

// === 错误处理测试 ===
setTimeout(() => {
  console.log("\n=== 错误处理测试 ===");
  const s2 = new Scheduler(2);

  s2.add(() => Promise.resolve("成功 A")).then(console.log).catch(console.error);
  s2.add(() => Promise.reject(new Error("失败 B"))).then(console.log).catch((e) => console.error("捕获错误:", e.message));
  s2.add(() => Promise.resolve("成功 C")).then(console.log).catch(console.error);
  // 预期：成功 A → 捕获错误: 失败 B → 成功 C（失败不影响后续任务）
}, 2000);

// === 基本信息 ===
// 预期输出：
// 任务 2 完成（~0.5s）
// 任务 3 完成（~0.8s）
// 任务 1 完成（~1.0s）
// 任务 4 完成（~1.4s）
