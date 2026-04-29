const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

class MyPromise {
  constructor(executor) {
    this.status = PENDING;
    this.value = undefined;
    this.reason = undefined;
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];

    const resolve = (value) => {
      if (this.status !== PENDING) return;
      if (value instanceof MyPromise) {
        value.then(resolve, reject);
        return;
      }
      if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
        try {
          const then = value.then;
          if (typeof then === 'function') {
            then.call(value, resolve, reject);
            return;
          }
        } catch (e) {
          reject(e);
          return;
        }
      }
      this.status = FULFILLED;
      this.value = value;
      this.onFulfilledCallbacks.forEach(fn => fn());
    };

    const reject = (reason) => {
      if (this.status !== PENDING) return;
      this.status = REJECTED;
      this.reason = reason;
      this.onRejectedCallbacks.forEach(fn => fn());
    };

    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }

  then(onFulfilled, onRejected) {
    onFulfilled = typeof onFulfilled === 'function'
      ? onFulfilled
      : value => value;

    onRejected = typeof onRejected === 'function'
      ? onRejected
      : reason => { throw reason; };

    const promise2 = new MyPromise((resolve, reject) => {
      const handle = (callback, arg, resolve, reject) => {
        setTimeout(() => {
          try {
            const result = callback(arg);
            resolvePromise(promise2, result, resolve, reject);
          } catch (e) {
            reject(e);
          }
        }, 0);
      };

      if (this.status === FULFILLED) {
        handle(onFulfilled, this.value, resolve, reject);
      } else if (this.status === REJECTED) {
        handle(onRejected, this.reason, resolve, reject);
      } else {
        this.onFulfilledCallbacks.push(() => {
          handle(onFulfilled, this.value, resolve, reject);
        });
        this.onRejectedCallbacks.push(() => {
          handle(onRejected, this.reason, resolve, reject);
        });
      }
    });

    return promise2;
  }

  catch(onRejected) {
    return this.then(null, onRejected);
  }

  finally(callback) {
    return this.then(
      value => MyPromise.resolve(callback()).then(() => value),
      reason => MyPromise.resolve(callback()).then(() => { throw reason; })
    );
  }

  static resolve(value) {
    if (value instanceof MyPromise) return value;
    return new MyPromise(resolve => resolve(value));
  }

  static reject(reason) {
    return new MyPromise((_, reject) => reject(reason));
  }

  static all(promises) {
    return new MyPromise((resolve, reject) => {
      const results = [];
      let count = 0;
      const items = Array.from(promises);

      if (items.length === 0) return resolve([]);

      items.forEach((item, index) => {
        MyPromise.resolve(item).then(
          value => {
            results[index] = value;
            count++;
            if (count === items.length) resolve(results);
          },
          reason => reject(reason)
        );
      });
    });
  }

  static race(promises) {
    return new MyPromise((resolve, reject) => {
      Array.from(promises).forEach(item => {
        MyPromise.resolve(item).then(resolve, reject);
      });
    });
  }

  static allSettled(promises) {
    return new MyPromise((resolve) => {
      const results = [];
      let count = 0;
      const items = Array.from(promises);

      if (items.length === 0) return resolve([]);

      items.forEach((item, index) => {
        MyPromise.resolve(item).then(
          value => {
            results[index] = { status: FULFILLED, value };
          },
          reason => {
            results[index] = { status: REJECTED, reason };
          }
        ).finally(() => {
          count++;
          if (count === items.length) resolve(results);
        });
      });
    });
  }
}

function resolvePromise(promise2, x, resolve, reject) {
  if (x === promise2) {
    return reject(new TypeError('Chaining cycle detected for promise'));
  }

  let called = false;

  if (x instanceof MyPromise) {
    x.then(
      value => resolvePromise(promise2, value, resolve, reject),
      reason => reject(reason)
    );
  } else if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    try {
      const then = x.then;
      if (typeof then === 'function') {
        then.call(
          x,
          value => {
            if (called) return;
            called = true;
            resolvePromise(promise2, value, resolve, reject);
          },
          reason => {
            if (called) return;
            called = true;
            reject(reason);
          }
        );
      } else {
        resolve(x);
      }
    } catch (e) {
      if (called) return;
      called = true;
      reject(e);
    }
  } else {
    resolve(x);
  }
}

module.exports = { MyPromise };
