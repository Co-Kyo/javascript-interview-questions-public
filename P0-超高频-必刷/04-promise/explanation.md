# 04 手写 Promise - 逐步讲解

---

## 第一步：理解问题

### 核心问题拆解

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

原生 Promise 的回调在**微任务队列**执行（优先级高于 setTimeout）。手写时用 `setTimeout(fn, 0)` 模拟，确保回调异步执行。

```javascript
console.log('1');
promise.then(() => console.log('2'));
console.log('3');
```

> 输出顺序：1 → 3 → 2（then 回调异步执行）


### 3. then 的链式调用

`then` 返回一个**全新的 Promise**，其状态由回调函数的返回值决定：

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
}
```

**要点**：
- 用数组存储回调，因为一个 Promise 可以被多次 then
- executor 外层包 try-catch，捕获同步异常
- `resolve` 中先检查是否是 Promise，再检查是否是 thenable（有 then 方法的对象），最后才作为普通值处理

### 3.2 实现 then

```javascript
then(onFulfilled, onRejected) {
  onFulfilled = typeof onFulfilled === 'function'
    ? onFulfilled : value => value;
  onRejected = typeof onRejected === 'function'
    ? onRejected : reason => { throw reason; };

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
      this.onFulfilledCallbacks.push(() => handle(onFulfilled, this.value, resolve, reject));
      this.onRejectedCallbacks.push(() => handle(onRejected, this.reason, resolve, reject));
    }
  });

  return promise2;
}
```

**值穿透**：当 then 的参数不是函数时，用透传函数代替，保证值可以"穿透"到下一个有函数处理的 then。**异步执行**：用 `setTimeout(..., 0)` 模拟微任务。**返回新 Promise**：实现链式调用。

### 3.3 resolvePromise（Resolution Procedure）

这是整个 Promise 最复杂的部分——处理 then 回调的返回值：

```javascript
function resolvePromise(promise2, x, resolve, reject) {
  if (x === promise2) {
    return reject(new TypeError('Chaining cycle detected'));
  }

  let called = false;

  if (x instanceof MyPromise) {
    x.then(resolve, reject);
  } else if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    try {
      const then = x.then;
      if (typeof then === 'function') {
        then.call(x,
          value => { if (!called) { called = true; resolvePromise(promise2, value, resolve, reject); } },
          reason => { if (!called) { called = true; reject(reason); } }
        );
      } else {
        resolve(x);
      }
    } catch (e) {
      if (!called) reject(e);
    }
  } else {
    resolve(x);
  }
}
```

**循环引用检测**：如果 `x === promise2`，说明 then 回调返回了自身，会无限递归，必须 reject。**`called` 标记**：thenable 的 then 方法可能同时调用 resolve 和 reject，Promise/A+ 规范规定一旦决议，后续调用忽略。

### 3.4 catch、finally 和静态方法

```javascript
catch(onRejected) {
  return this.then(null, onRejected);
}

finally(callback) {
  return this.then(
    value => MyPromise.resolve(callback()).then(() => value),
    reason => MyPromise.resolve(callback()).then(() => { throw reason; })
  );
}
```

`finally` 的核心：用 `.then()` 包装 callback，返回原值。`callback()` 的返回值被 `MyPromise.resolve()` 包装后等待完成，但 `.then(() => value)` 始终返回原始值。如果 `callback()` 抛出异常，异常会替代原始值传递下去。

静态方法 `resolve`、`reject`、`all`、`race`、`allSettled` 的实现见 `solution.js`。

---

## 第四步：常见追问

### Q1：then 回调为什么必须异步执行？

```javascript
const p = MyPromise.resolve(1);
p.then(() => console.log('then'));
console.log('sync');
```

> ⚠️ 如果 `then` 同步执行，输出顺序会是 `then → sync`。正确行为是 `sync → then`。

原生 Promise 规范要求回调异步执行（微任务），保证代码执行顺序的可预测性。

### Q2：值穿透是怎么回事？

```javascript
MyPromise.resolve(42)
  .then()
  .then()
  .then(v => console.log(v));
```

输出 `42`——当 then 的参数不是函数时，用透传函数代替，保证值可以"穿透"到下一个有函数处理的 then。

### Q3：Promise.all 和 Promise.race 的区别？

| 方法 | 行为 | 空数组 |
|------|------|--------|
| `all` | 全部成功才 resolve，任一失败立即 reject | `resolve([])` |
| `race` | 取第一个完成的结果 | 永远 pending |
| `allSettled` | 等所有完成，收集状态 | `resolve([])` |
| `finally` | 无论成功失败都执行，不改变值 | — |

### Q4：为什么原生用微任务而不用宏任务？

微任务在当前宏任务结束后、下一个宏任务开始前执行。如果用 setTimeout（宏任务），UI 渲染可能插在回调之前，导致视觉不一致。微任务保证了 Promise 回调的"连续性"。

---

## 第五步：易错点

### ❌ 易错 1：忘记异步执行 then 回调

```javascript
if (this.status === FULFILLED) {
  const result = onFulfilled(this.value);
  resolve(result);
}
```

> ⚠️ 这里是同步执行，没有用 `setTimeout` 包裹回调。

必须用 `setTimeout` 包裹，保证回调异步执行。

### ❌ 易错 2：then 返回值直接 resolve，不走 resolvePromise

```javascript
const result = onFulfilled(this.value);
resolve(result);
```

> ⚠️ 如果 `result` 是 `promise2` 自身呢？直接 `resolve` 不处理 thenable 和循环引用，会出问题。

必须走 `resolvePromise` 处理所有情况（普通值、Promise、thenable、循环引用）。

### ❌ 易错 3：忘记处理 pending 状态

```javascript
then(onFulfilled) {
  if (this.status === FULFILLED) {
    onFulfilled(this.value);
  }
}
```

> ⚠️ 只处理了已决议状态，忘记 `pending` 分支！异步 Promise 的 then 回调不会执行。

pending 时必须注册回调到队列，等 resolve/reject 触发时再执行。

### ❌ 易错 4：Promise.all 顺序混乱

```javascript
results.push(value);
```

> ⚠️ 用 `push` 而不是按 index 赋值——如果第二个 Promise 先完成，顺序就乱了。

必须按 index 赋值：`results[index] = value`，保证结果顺序与输入一致。

### ❌ 易错 5：循环引用检测

```javascript
const promise2 = promise1.then(() => promise2);
```

> ⚠️ 不检测循环引用会无限递归，必须 `reject(TypeError)`。

