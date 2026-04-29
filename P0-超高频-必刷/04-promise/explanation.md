# 04 手写 Promise - 逐步讲解

---

## 第一步：理解问题

### Promise 是什么？

Promise 是 JavaScript 中处理异步操作的对象，代表一个**最终会完成（或失败）的操作及其结果值**。

### 核心问题拆解

在动手写之前，先搞清楚要解决的几个关键问题：

| 问题 | 说明 |
|------|------|
| 状态如何管理？ | pending → fulfilled / rejected，不可逆 |
| 异步回调如何注册？ | pending 时 then 注册回调，resolve/reject 时触发 |
| 链式调用如何实现？ | then 返回新 Promise，回调返回值决定下一个状态 |
| 错误如何冒泡？ | catch 是 then(null, onRejected) 的语法糖 |

---

## 第二步：核心思路

### 1. 三态状态机

```
         resolve(value)
pending ─────────────────→ fulfilled
  │
  │       reject(reason)
  └────────────────────→ rejected
```

- **pending**：初始状态，可以变为 fulfilled 或 rejected
- **fulfilled**：已完成，有一个不可变的 `value`
- **rejected**：已失败，有一个不可变的 `reason`

**状态不可逆**是关键约束——只有第一次 resolve/reject 生效。

### 2. 微任务调度

原生 Promise 的回调在**微任务队列**执行（优先级高于 setTimeout）。手写时用 `setTimeout(fn, 0)` 模拟，确保回调异步执行：

```javascript
// 同步代码先执行
console.log('1');
promise.then(() => console.log('2'));
console.log('3');
// 输出顺序：1 → 3 → 2（then 回调异步执行）
```

### 3. then 的链式调用

这是 Promise 最精妙的设计。`then` 返回一个**全新的 Promise**，其状态由回调函数的返回值决定：

```
p1.then(cb1)  →  p2
                  │
                  ├─ cb1 返回普通值 → p2 fulfilled(value)
                  ├─ cb1 返回 Promise → p2 等待该 Promise
                  ├─ cb1 抛出异常 → p2 rejected(error)
                  └─ cb1 不是函数 → 值穿透
```

---

## 第三步：逐步实现

### 3.1 构造函数骨架

```javascript
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
      if (this.status !== PENDING) return;  // 状态不可逆（先检查）
      if (value instanceof MyPromise) {     // 再检查 Promise
        value.then(resolve, reject);
        return;
      }
      // 检查 thenable（有 then 方法的对象）
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
      executor(resolve, reject);  // 捕获 executor 同步异常
    } catch (e) {
      reject(e);
    }
  }
}
```

**要点**：
- 用数组存储回调，因为一个 Promise 可以被多次 then
- executor 外层包 try-catch，捕获同步异常

### 3.2 实现 then

```javascript
then(onFulfilled, onRejected) {
  // 值穿透：非函数包装为透传
  onFulfilled = typeof onFulfilled === 'function'
    ? onFulfilled : value => value;
  onRejected = typeof onRejected === 'function'
    ? onRejected : reason => { throw reason; };

  const promise2 = new MyPromise((resolve, reject) => {
    const handle = (callback, arg, resolve, reject) => {
      setTimeout(() => {  // 异步执行
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
      // pending：注册回调
      this.onFulfilledCallbacks.push(() => handle(onFulfilled, this.value, resolve, reject));
      this.onRejectedCallbacks.push(() => handle(onRejected, this.reason, resolve, reject));
    }
  });

  return promise2;
}
```

### 3.3 resolvePromise（Resolution Procedure）

这是整个 Promise 最复杂的部分——处理 then 回调的返回值：

```javascript
function resolvePromise(promise2, x, resolve, reject) {
  if (x === promise2) {  // 循环引用检测
    return reject(new TypeError('Chaining cycle detected'));
  }

  let called = false;  // thenable 防重复调用

  if (x instanceof MyPromise) {
    x.then(resolve, reject);  // 递归等待
  } else if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    try {
      const then = x.then;
      if (typeof then === 'function') {
        then.call(x,  // thenable：尝试调用
          value => { if (!called) { called = true; resolvePromise(promise2, value, resolve, reject); } },
          reason => { if (!called) { called = true; reject(reason); } }
        );
      } else {
        resolve(x);  // 有 then 属性但不是函数
      }
    } catch (e) {
      if (!called) reject(e);
    }
  } else {
    resolve(x);  // 普通值
  }
}
```

### 3.4 catch、finally 和静态方法

```javascript
// catch 是语法糖
catch(onRejected) {
  return this.then(null, onRejected);
}

// finally：无论成功失败都执行，不改变传递的值
finally(callback) {
  return this.then(
    value => MyPromise.resolve(callback()).then(() => value),
    reason => MyPromise.resolve(callback()).then(() => { throw reason; })
  );
}

// 静态方法
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
        value => { results[index] = value; if (++count === items.length) resolve(results); },
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

// allSettled：等所有 Promise 完成，收集状态和值
static allSettled(promises) {
  return new MyPromise((resolve) => {
    const results = [];
    let count = 0;
    const items = Array.from(promises);
    if (items.length === 0) return resolve([]);

    items.forEach((item, index) => {
      MyPromise.resolve(item).then(
        value => { results[index] = { status: FULFILLED, value }; },
        reason => { results[index] = { status: REJECTED, reason }; }
      ).finally(() => {
        count++;
        if (count === items.length) resolve(results);
      });
    });
  });
}
```

---

## 第四步：常见追问

### Q1：then 回调为什么必须异步执行？

```javascript
const p = MyPromise.resolve(1);
p.then(() => console.log('then'));
console.log('sync');
// 如果 then 同步执行：then → sync
// 正确行为：sync → then
```

原生 Promise 规范要求回调异步执行（微任务），保证代码执行顺序的可预测性。如果 then 同步执行，当 Promise 已经 resolve 时，回调会立即执行，打断当前同步代码的执行流程。

### Q2：值穿透是怎么回事？

```javascript
MyPromise.resolve(42)
  .then()        // onFulfilled 不是函数 → 包装为 value => value
  .then()        // 同上
  .then(v => console.log(v));  // 42
```

当 then 的参数不是函数时，用透传函数代替，保证值可以"穿透"到下一个有函数处理的 then。

### Q3：resolvePromise 为什么需要 called 标记？

```javascript
// thenable 可能同时调用 resolve 和 reject
const thenable = {
  then(resolve, reject) {
    resolve(1);
    reject(2);  // 不应生效
  }
};
```

Promise/A+ 规范规定：一旦决议，后续调用忽略。`called` 标记防止 thenable 的 then 方法多次调用。

### Q4：Promise.all 和 Promise.race 的区别？

| 方法 | 行为 | 空数组 |
|------|------|--------|
| `all` | 全部成功才 resolve，任一失败立即 reject | `resolve([])` |
| `race` | 取第一个完成的结果 | 永远 pending |
| `allSettled` | 等所有完成，收集状态 | `resolve([])` |
| `finally` | 无论成功失败都执行，不改变值 | — |

### Q5：为什么原生用微任务而不用宏任务？

微任务在当前宏任务结束后、下一个宏任务开始前执行。如果用 setTimeout（宏任务），UI 渲染可能插在回调之前，导致视觉不一致。微任务保证了 Promise 回调的"连续性"。

### Q6：finally 是怎么做到不改变值的？

```javascript
// finally 的核心：用 .then() 包装 callback，返回原值
finally(callback) {
  return this.then(
    value => MyPromise.resolve(callback()).then(() => value),
    reason => MyPromise.resolve(callback()).then(() => { throw reason; })
  );
}
```

`callback()` 的返回值被 `MyPromise.resolve()` 包装后等待完成，但 `.then(() => value)` 始终返回原始值。如果 `callback()` 抛出异常，异常会替代原始值传递下去。

---

## 第五步：易错点

### ❌ 易错 1：忘记异步执行 then 回调

```javascript
// 错误：同步执行回调
if (this.status === FULFILLED) {
  const result = onFulfilled(this.value);  // 同步！
  resolve(result);
}

// 正确：用 setTimeout 包裹
setTimeout(() => {
  const result = onFulfilled(this.value);
  resolve(result);
}, 0);
```

### ❌ 易错 2：then 返回值直接 resolve，不走 resolvePromise

```javascript
// 错误：直接 resolve，不处理 thenable 和循环引用
then(onFulfilled) {
  return new MyPromise((resolve) => {
    const result = onFulfilled(this.value);
    resolve(result);  // 如果 result 是 Promise2 自身呢？
  });
}

// 正确：必须走 resolvePromise 处理所有情况
```

### ❌ 易错 3：忘记处理 pending 状态

```javascript
// 错误：只处理已决议状态
then(onFulfilled) {
  if (this.status === FULFILLED) {
    onFulfilled(this.value);
  }
  // 忘记 pending 分支！异步 Promise 的 then 回调不会执行
}

// 正确：pending 时注册回调到队列
else {
  this.onFulfilledCallbacks.push(() => { ... });
}
```

### ❌ 易错 4：Promise.all 顺序混乱

```javascript
// 错误：push 而不是按 index 赋值
results.push(value);  // 如果第二个 Promise 先完成呢？

// 正确：按 index 赋值
results[index] = value;
```

### ❌ 易错 5：循环引用检测

```javascript
// 如果 then 回调返回 promise2 自身
const promise2 = promise1.then(() => promise2);
// 不检测会无限递归，必须 reject(TypeError)
```

---

## 总结

手写 Promise 的核心就三件事：

1. **状态机**：三态 + 不可逆，用闭包保存状态和值
2. **then 链式**：返回新 Promise + resolvePromise 处理返回值
3. **异步调度**：setTimeout 模拟微任务，保证回调异步执行

理解了这三点，Promise 的 80% 就掌握了。剩下 20% 是 thenable 处理、循环引用检测等边界情况——这些正是区分"背答案"和"真理解"的地方。
