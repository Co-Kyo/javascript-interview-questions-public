/**
 * AsyncQueue - 异步任务队列
 *
 * 支持：
 *   - 按添加顺序执行异步任务
 *   - 可配置并发数
 *   - pause / resume 控制
 *   - 任务结果收集（含成功/失败）
 */

class AsyncQueue {
  /**
   * @param {Object} options
   * @param {number} [options.concurrency=1] - 最大并发任务数
   */
  constructor({ concurrency = 1 } = {}) {
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      throw new TypeError('concurrency must be a positive integer');
    }

    // 配置
    this._concurrency = concurrency;

    // 内部任务队列（等待执行的任务）
    this._queue = [];

    // 当前正在运行的任务数
    this._running = 0;

    // 暂停标志
    this._paused = false;

    // 已完成任务的结果收集
    this._results = [];

    // 销毁标志
    this._destroyed = false;
  }

  /**
   * 添加一个异步任务
   * @param {Function} task - 返回 Promise 的函数
   * @returns {Promise} 该任务的执行结果
   */
  add(task) {
    if (this._destroyed) {
      return Promise.reject(new Error('Queue has been destroyed'));
    }

    if (typeof task !== 'function') {
      throw new TypeError('task must be a function');
    }

    return new Promise((resolve, reject) => {
      // 将任务包装后放入队列，保留原始的 resolve/reject
      this._queue.push({ task, resolve, reject });

      // 尝试调度执行（如果没有暂停且有空位）
      this._schedule();
    });
  }

  /**
   * 暂停队列：正在执行的任务继续完成，但不再启动新任务
   */
  pause() {
    this._paused = true;
  }

  /**
   * 恢复队列：继续调度并执行等待中的任务
   */
  resume() {
    this._paused = false;
    // 恢复后立即尝试调度
    this._schedule();
  }

  /**
   * 获取所有已完成任务的结果
   * @returns {Array<{status: string, value: any}>}
   */
  get results() {
    return this._results.map(r => {
      const copy = { status: r.status };
      if (r.value instanceof Error) {
        const errCopy = new Error(r.value.message);
        errCopy.stack = r.value.stack;
        copy.value = errCopy;
      } else if (r.value !== null && typeof r.value === 'object') {
        copy.value = JSON.parse(JSON.stringify(r.value));
      } else {
        copy.value = r.value;
      }
      return copy;
    });
  }

  /**
   * 清空等待队列（不影响正在执行的任务）
   * 被清空的任务会以 rejected 状态完成，reason 为 Error('Queue cleared')
   */
  clear() {
    while (this._queue.length > 0) {
      const err = new Error('Queue cleared');
      const { reject } = this._queue.shift();
      this._results.push({ status: 'rejected', value: err });
      reject(err);
    }
  }

  /**
   * 销毁队列：清空等待任务 + 重置状态
   */
  destroy() {
    this.clear();
    this._running = 0;
    this._paused = false;
    this._results = [];
    this._destroyed = true;
  }

  /**
   * 核心调度逻辑
   * 在有空位且未暂停时，从队列头部取出任务并执行
   */
  _schedule() {
    // 暂停中 或 没有等待的任务 或 并发已满 → 不调度
    while (
      !this._paused &&
      !this._destroyed &&
      this._queue.length > 0 &&
      this._running < this._concurrency
    ) {
      // 从队列头部取出一个任务（FIFO）
      const { task, resolve, reject } = this._queue.shift();

      // 并发计数 +1
      this._running++;

      // 执行任务
      task()
        .then((value) => {
          // 成功：记录结果，resolve 外层 Promise
          this._results.push({ status: 'fulfilled', value });
          resolve(value);
        })
        .catch((error) => {
          // 失败：记录结果，reject 外层 Promise
          this._results.push({ status: 'rejected', value: error });
          reject(error);
        })
        .finally(() => {
          // 无论成功失败，释放并发槽位，继续调度下一个
          this._running--;
          this._schedule();
        });
    }
  }
}

// ==================== 使用示例 ====================

async function runDemos() {
  // 示例 1：串行执行
  console.log('--- 示例 1：串行执行 ---');
  const queue1 = new AsyncQueue();
  const task1 = () => new Promise(r => setTimeout(() => r('结果1'), 300));
  const task2 = () => new Promise(r => setTimeout(() => r('结果2'), 200));
  const task3 = () => new Promise(r => setTimeout(() => r('结果3'), 100));

  const p1 = queue1.add(task1);
  const p2 = queue1.add(task2);
  const p3 = queue1.add(task3);
  console.log(await p1); // '结果1'
  console.log(await p2); // '结果2'
  console.log(await p3); // '结果3'
  console.log(queue1.results);

  // 示例 2：并发执行
  console.log('\n--- 示例 2：并发执行 ---');
  const queue2 = new AsyncQueue({ concurrency: 2 });
  const fast = () => new Promise(r => setTimeout(() => r('快'), 100));
  const slow = () => new Promise(r => setTimeout(() => r('慢'), 300));
  const mid = () => new Promise(r => setTimeout(() => r('中'), 200));
  const results2 = await Promise.all([
    queue2.add(fast), queue2.add(slow), queue2.add(mid),
  ]);
  console.log(results2); // ['快', '慢', '中']

  // 示例 3：暂停/恢复
  console.log('\n--- 示例 3：暂停/恢复 ---');
  const queue3 = new AsyncQueue();
  const task = (name, ms) => () =>
    new Promise(r => setTimeout(() => { console.log(`完成: ${name}`); r(name); }, ms));
  queue3.add(task('A', 200));
  queue3.pause();
  queue3.add(task('B', 100));
  queue3.add(task('C', 100));
  await new Promise(r => setTimeout(r, 300));
  console.log('暂停中 results:', queue3.results.length); // 1 (只有 A)
  queue3.resume();
  await new Promise(r => setTimeout(r, 300));
  console.log('恢复后 results:', queue3.results.length); // 3

  // 示例 4：错误处理
  console.log('\n--- 示例 4：错误处理 ---');
  const queue4 = new AsyncQueue();
  const ok = () => Promise.resolve('成功');
  const fail = () => Promise.reject(new Error('失败'));
  const po = queue4.add(ok);
  const pf = queue4.add(fail);
  console.log(await po); // '成功'
  try { await pf; } catch (e) { console.log(e.message); } // '失败'
  console.log(queue4.results);

  // 示例 5：clear()
  console.log('\n--- 示例 5：clear() ---');
  const queue5 = new AsyncQueue();
  const p5a = queue5.add(() => new Promise(r => setTimeout(r, 5000, 'slow')));
  const p5b = queue5.add(() => Promise.resolve('queued'));
  p5a.catch(() => {}); // 防止 unhandledRejection
  p5b.catch(() => {}); // 防止 unhandledRejection
  queue5.clear();
  console.log('队列长度:', queue5._queue.length); // 0
}

if (require.main === module) {
  runDemos().catch(console.error);
}

module.exports = { AsyncQueue };
