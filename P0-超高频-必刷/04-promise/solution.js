/**
 * MyPromise - 手写 Promise 完整实现
 *
 * 核心要点：
 * 1. 三态状态机：pending → fulfilled / rejected（不可逆）
 * 2. then 链式调用：返回新 Promise + 值穿透
 * 3. 异步调度：用 setTimeout 模拟微任务
 * 4. 错误冒泡：catch 透传 + executor 异常捕获
 */

const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

class MyPromise {
  constructor(executor) {
    this.status = PENDING;
    this.value = undefined;
    this.reason = undefined;

    // 存储异步回调（pending 状态时 then 会注册回调到这里）
    this.onFulfilledCallbacks = [];
    this.onRejectedCallbacks = [];

    // resolve：将状态从 pending 变为 fulfilled
    const resolve = (value) => {
      // 状态不可逆：只有 pending 才能变更
      if (this.status !== PENDING) return;
      // 如果 resolve 的值是 Promise，递归解析
      if (value instanceof MyPromise) {
        value.then(resolve, reject);
        return;
      }
      // 如果 resolve 的值是 thenable（有 then 方法的对象），递归解析
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
      // 异步执行所有注册的 onFulfilled 回调
      this.onFulfilledCallbacks.forEach(fn => fn());
    };

    // reject：将状态从 pending 变为 rejected
    const reject = (reason) => {
      if (this.status !== PENDING) return;
      this.status = REJECTED;
      this.reason = reason;
      this.onRejectedCallbacks.forEach(fn => fn());
    };

    // 立即执行 executor，捕获同步异常
    try {
      executor(resolve, reject);
    } catch (e) {
      reject(e);
    }
  }

  /**
   * then - 核心方法，支持链式调用
   *
   * 关键设计：
   * 1. 返回一个新的 MyPromise，实现链式调用
   * 2. onFulfilled/onRejected 非函数时做值穿透
   * 3. 回调异步执行（setTimeout 模拟微任务）
   * 4. 回调返回值决定下一个 Promise 的状态
   */
  then(onFulfilled, onRejected) {
    // 值穿透：如果不是函数，包装为透传函数
    onFulfilled = typeof onFulfilled === 'function'
      ? onFulfilled
      : value => value;

    onRejected = typeof onRejected === 'function'
      ? onRejected
      : reason => { throw reason; };

    // 返回新 Promise，实现链式调用
    const promise2 = new MyPromise((resolve, reject) => {
      // 统一处理回调执行 + 新 Promise 状态决议
      const handle = (callback, arg, resolve, reject) => {
        // 异步执行：setTimeout 模拟微任务
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
        // pending 状态：注册回调，等待 resolve/reject 触发
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

  /**
   * catch - 错误捕获的语法糖
   * 等价于 .then(null, onRejected)
   */
  catch(onRejected) {
    return this.then(null, onRejected);
  }

  /**
   * finally - 无论成功失败都执行，不改变值
   */
  finally(callback) {
    return this.then(
      value => MyPromise.resolve(callback()).then(() => value),
      reason => MyPromise.resolve(callback()).then(() => { throw reason; })
    );
  }

  // ========== 静态方法 ==========

  /**
   * MyPromise.resolve - 将值包装为 fulfilled 的 Promise
   */
  static resolve(value) {
    if (value instanceof MyPromise) return value;
    return new MyPromise(resolve => resolve(value));
  }

  /**
   * MyPromise.reject - 将值包装为 rejected 的 Promise
   */
  static reject(reason) {
    return new MyPromise((_, reject) => reject(reason));
  }

  /**
   * MyPromise.all - 全部成功才 resolve，任一失败立即 reject
   *
   * 要点：
   * - 按顺序收集结果（与输入顺序一致）
   * - 支持非 Promise 值（自动包装）
   * - 空数组立即 resolve([])
   */
  static all(promises) {
    return new MyPromise((resolve, reject) => {
      const results = [];
      let count = 0;
      const items = Array.from(promises);

      if (items.length === 0) return resolve([]);

      items.forEach((item, index) => {
        // 统一处理 Promise 和普通值
        MyPromise.resolve(item).then(
          value => {
            results[index] = value; // 保持顺序
            count++;
            if (count === items.length) resolve(results);
          },
          reason => reject(reason) // 任一失败立即 reject
        );
      });
    });
  }

  /**
   * MyPromise.race - 取第一个完成的结果（无论成功或失败）
   */
  static race(promises) {
    return new MyPromise((resolve, reject) => {
      Array.from(promises).forEach(item => {
        MyPromise.resolve(item).then(resolve, reject);
      });
    });
  }

  /**
   * MyPromise.allSettled - 等所有 Promise 完成（无论成功失败）
   */
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

/**
 * resolvePromise - Promise/A+ Resolution Procedure
 *
 * 处理 then 回调返回值，决定下一个 Promise 的状态：
 * 1. 返回 Promise → 递归等待
 * 2. 返回 thenable → 尝试调用其 then
 * 3. 返回普通值 → 直接 resolve
 * 4. 防止循环引用（x === promise2）
 */
function resolvePromise(promise2, x, resolve, reject) {
  // 防止循环引用
  if (x === promise2) {
    return reject(new TypeError('Chaining cycle detected for promise'));
  }

  // 已调用标记（thenable 可能多次调用 then）
  let called = false;

  if (x instanceof MyPromise) {
    // x 是 Promise：递归等待其结果
    x.then(
      value => resolvePromise(promise2, value, resolve, reject),
      reason => reject(reason)
    );
  } else if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    // x 是 thenable 对象：尝试调用 x.then
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
        // x 有 then 属性但不是函数，当普通值处理
        resolve(x);
      }
    } catch (e) {
      if (called) return;
      called = true;
      reject(e);
    }
  } else {
    // x 是普通值：直接 resolve
    resolve(x);
  }
}

// ========== 测试 ==========

// 测试 1：基本异步 + 链式调用
console.log('--- 测试 1：基本链式调用 ---');
new MyPromise((resolve) => {
  setTimeout(() => resolve(1), 100);
}).then(val => {
  console.log(val); // 1
  return val + 1;
}).then(val => {
  console.log(val); // 2
  return new MyPromise(r => setTimeout(() => r(val * 10), 100));
}).then(val => {
  console.log(val); // 20
});

// 测试 2：错误捕获
console.log('--- 测试 2：错误捕获 ---');
new MyPromise((_, reject) => {
  reject('出错了');
}).catch(err => {
  console.log(err); // '出错了'
  return '恢复';
}).then(val => {
  console.log(val); // '恢复'
});

// 测试 3：MyPromise.all
console.log('--- 测试 3：Promise.all ---');
MyPromise.all([
  MyPromise.resolve(1),
  new MyPromise(r => setTimeout(() => r(2), 50)),
  3
]).then(results => {
  console.log(results); // [1, 2, 3]
});

// 测试 4：MyPromise.race
console.log('--- 测试 4：Promise.race ---');
MyPromise.race([
  new MyPromise(r => setTimeout(() => r('慢'), 200)),
  new MyPromise(r => setTimeout(() => r('快'), 50))
]).then(val => {
  console.log(val); // '快'
});

// 测试 5：值穿透
console.log('--- 测试 5：值穿透 ---');
MyPromise.resolve(42)
  .then()
  .then()
  .then(val => console.log(val)); // 42

// 测试 6：executor 同步异常捕获
console.log('--- 测试 6：同步异常 ---');
new MyPromise(() => {
  throw new Error('executor 报错');
}).catch(err => {
  console.log(err.message); // 'executor 报错'
});

// 测试 7：finally 不改变值
console.log('--- 测试 7：finally ---');
MyPromise.resolve('原始值')
  .finally(() => {
    console.log('finally 执行');
    return 'ignored'; // finally 返回值被忽略
  })
  .then(val => {
    console.log(val); // '原始值'
  });

// 测试 8：finally 错误传递
console.log('--- 测试 8：finally 错误传递 ---');
MyPromise.reject('原始错误')
  .finally(() => {
    console.log('finally 执行（rejected）');
  })
  .catch(err => {
    console.log(err); // '原始错误'
  });

// 测试 9：allSettled
console.log('--- 测试 9：allSettled ---');
MyPromise.allSettled([
  MyPromise.resolve('成功'),
  MyPromise.reject('失败'),
  42
]).then(results => {
  console.log(results);
  // [
  //   { status: 'fulfilled', value: '成功' },
  //   { status: 'rejected', reason: '失败' },
  //   { status: 'fulfilled', value: 42 }
  // ]
});

// 测试 10：循环引用检测
console.log('--- 测试 10：循环引用 ---');
const p = MyPromise.resolve(1);
const p2 = p.then(() => p2); // 返回自身
p2.catch(err => {
  console.log(err instanceof TypeError); // true
  console.log(err.message); // 'Chaining cycle detected for promise'
});

// 测试 11：thenable 解析
console.log('--- 测试 11：thenable ---');
const thenable = {
  then(resolve) {
    setTimeout(() => resolve('thenable 结果'), 10);
  }
};
MyPromise.resolve(thenable).then(val => {
  console.log(val); // 'thenable 结果'
});
