class Scheduler {
  constructor(max) {
    if (!Number.isInteger(max) || max < 1) {
      throw new RangeError(`max 必须为正整数，收到: ${max}`);
    }
    this.max = max;
    this.runningCount = 0;
    this.queue = [];
  }

  add(task) {
    if (typeof task !== 'function') {
      return Promise.reject(new TypeError(`task 必须是函数，收到: ${typeof task}`));
    }
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this._run();
    });
  }

  _run() {
    while (this.runningCount < this.max && this.queue.length > 0) {
      const { task, resolve, reject } = this.queue.shift();
      this.runningCount++;

      task()
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(error);
        })
        .finally(() => {
          this.runningCount--;
          this._run();
        });
    }
  }
}

module.exports = { Scheduler };
