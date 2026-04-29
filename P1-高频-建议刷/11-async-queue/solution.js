class AsyncQueue {
  constructor({ concurrency = 1 } = {}) {
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      throw new TypeError('concurrency must be a positive integer');
    }

    this._concurrency = concurrency;
    this._queue = [];
    this._running = 0;
    this._paused = false;
    this._results = [];
    this._destroyed = false;
  }

  add(task) {
    if (this._destroyed) {
      return Promise.reject(new Error('Queue has been destroyed'));
    }

    if (typeof task !== 'function') {
      throw new TypeError('task must be a function');
    }

    return new Promise((resolve, reject) => {
      this._queue.push({ task, resolve, reject });
      this._schedule();
    });
  }

  pause() {
    this._paused = true;
  }

  resume() {
    this._paused = false;
    this._schedule();
  }

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

  clear() {
    while (this._queue.length > 0) {
      const err = new Error('Queue cleared');
      const { reject } = this._queue.shift();
      this._results.push({ status: 'rejected', value: err });
      reject(err);
    }
  }

  destroy() {
    this.clear();
    this._running = 0;
    this._paused = false;
    this._results = [];
    this._destroyed = true;
  }

  _schedule() {
    while (
      !this._paused &&
      !this._destroyed &&
      this._queue.length > 0 &&
      this._running < this._concurrency
    ) {
      const { task, resolve, reject } = this._queue.shift();
      this._running++;

      task()
        .then((value) => {
          this._results.push({ status: 'fulfilled', value });
          resolve(value);
        })
        .catch((error) => {
          this._results.push({ status: 'rejected', value: error });
          reject(error);
        })
        .finally(() => {
          this._running--;
          this._schedule();
        });
    }
  }
}

module.exports = { AsyncQueue };
