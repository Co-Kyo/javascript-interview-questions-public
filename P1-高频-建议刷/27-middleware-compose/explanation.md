# 27 - 中间件洋葱模型 - 讲解

## 第一步：理解问题

面试官想考察两件事：

1. **洋葱模型的执行顺序** — 中间件 A 的前半部分 → B 的前半部分 → C 的核心 → B 的后半部分 → A 的后半部分，像剥洋葱一样一层层进入再一层层返回
2. **递归与 Promise 链** — `for` 循环只能一路向前，无法在每个中间件执行完后"返回"。必须用递归或嵌套实现 `next()` 前后都能执行代码

每个中间件的 `next()` 本质上就是调用下一个中间件。compose 的核心就是把每个中间件的 `next` 绑定到"下一个中间件的调用"上。

---

## 第二步：核心思路

compose 内部用一个 `dispatch` 函数实现递归：

```
dispatch(0) → 执行中间件0，next = dispatch(1)
  dispatch(1) → 执行中间件1，next = dispatch(2)
    dispatch(2) → 执行中间件2，next = dispatch(3)
      dispatch(3) → 没有更多中间件，返回 Promise.resolve()
    ← dispatch(2) 的 next 返回，执行中间件2后半部分
  ← dispatch(1) 的 next 返回，执行中间件1后半部分
← dispatch(0) 的 next 返回，执行中间件0后半部分
```

关键设计点：

| 设计 | 原因 |
|------|------|
| `let index = -1` | 防止同一个中间件多次调用 `next()` |
| `Promise.resolve(fn(...))` | 兼容同步和异步中间件，统一返回 Promise |
| `fn = () => Promise.resolve()` | 最后一个中间件的 `next()` 不报错，静默结束 |
| `try/catch` | 捕获中间件同步抛出的异常 |

---

## 第三步：逐步实现

### 3.1 参数校验

```javascript
function compose(middlewares) {
  if (!Array.isArray(middlewares)) {
    throw new TypeError('middlewares must be an array')
  }

  for (const fn of middlewares) {
    if (typeof fn !== 'function') {
      throw new TypeError('each middleware must be a function')
    }
  }
```

确保入参是数组，且每个元素都是函数。这是防御式编程的基本功。

### 3.2 返回组合函数

```javascript
  return function (context) {
    let index = -1
```

返回一个接收 `context` 的函数，所有中间件共享同一个 `context`。`index` 记录当前执行到第几个中间件，初始为 `-1`。

### 3.3 dispatch 递归核心

```javascript
    function dispatch(i) {
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'))
      }
      index = i

      let fn = middlewares[i]
      if (i === middlewares.length) {
        fn = () => Promise.resolve()
      }

      try {
        return Promise.resolve(fn(context, () => dispatch(i + 1)))
      } catch (err) {
        return Promise.reject(err)
      }
    }
```

**`i <= index` 检查**：如果同一个中间件调用了两次 `next()`，第二次的 `i` 会小于等于已记录的 `index`，此时抛错。这是 Koa 的保护机制。

**`i === middlewares.length`**：所有中间件执行完毕，用一个返回 `Promise.resolve()` 的空函数作为兜底，让最后一个中间件的 `next()` 正常结束。

**`Promise.resolve(fn(...))`**：无论中间件是同步还是异步，都统一包装为 Promise。外层 `try/catch` 捕获同步异常，转为 `Promise.reject`。

### 3.4 启动执行

```javascript
    return dispatch(0)
  }
}
```

从第一个中间件开始执行，返回 Promise。

---

## 第四步：常见追问

### Q1：为什么不直接用 for 循环？

for 循环只能"一路向前"，无法在每个中间件执行完后"返回"。洋葱模型需要在 `next()` 前后都能执行代码，必须用递归或嵌套的方式实现。

### Q2：Koa 的 compose 和 Redux 的 middleware 有什么区别？

- **Koa**：`async (ctx, next) => { await next() }`，洋葱模型，有后半段处理
- **Redux**：`store => next => action => { ... }`，柯里化，通过闭包持有 `next`，更侧重于"拦截 action"
- 核心思想一致：都是将多个函数组合成一个调用链

### Q3：中间件抛出异常时洋葱模型如何工作？

异常会沿洋葱向外传播。当中间件 B 抛出异常，B 的后半部分不会执行，控制权直接回到外层中间件 A 的 `await next()` 处。如果 A 有 try/catch 则捕获处理，否则继续向外传播。

### Q4：compose 的时间/空间复杂度是多少？

- **时间复杂度**：O(n)，n 为中间件数量。compose 组合阶段 O(n)，执行阶段每个中间件恰好执行一次
- **空间复杂度**：O(n)，dispatch 递归调用栈深度最多 n 层

---

## 第五步：易错点

| 易错点 | 说明 |
|-------|------|
| 用 for 循环代替递归 | 无法实现洋葱模型的"返回"阶段 |
| 忘记处理空数组 | `compose([])` 应返回可正常调用的函数 |
| 不防止 next() 多次调用 | Koa 的标准行为是抛错 |
| 忘记用 Promise.resolve 包装 | 同步中间件会导致返回值不是 Promise |
| 不捕获同步异常 | 中间件同步抛错时需要 try/catch 转为 rejected Promise |
