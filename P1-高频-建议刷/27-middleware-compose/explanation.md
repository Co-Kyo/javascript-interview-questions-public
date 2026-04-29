# 27 - 中间件洋葱模型 - 题解讲解

## 🧅 五步理解洋葱模型

---

## 第一步：理解洋葱模型的执行顺序

想象一个请求穿过三层洋葱皮：

```
请求进入 →
  ┌─ 中间件 A（前半部分）──┐
  │  ┌─ 中间件 B（前半部分）──┐
  │  │  ┌─ 中间件 C（前半部分）──┐
  │  │  │                        │
  │  │  │     核心处理（无更多中间件）│
  │  │  │                        │
  │  │  └─ 中间件 C（后半部分）──┘
  │  └─ 中间件 B（后半部分）──┘
  └─ 中间件 A（后半部分）──┘
← 响应返回
```

**关键**：每个中间件的 `next()` 调用是"进入下一层"，`next()` 返回后是"从下一层返回"。

---

## 第二步：理解 next() 的本质

`next()` 不是什么魔法，它就是**调用下一个中间件的函数**。

```javascript
// 中间件 B 的 next 实际上就是中间件 C 的执行函数
async function B(ctx, next) {
  // next = () => C(ctx, nextOfC)
  console.log('B 前')
  await next()  // 等待 C 执行完毕
  console.log('B 后')  // C 执行完后才到这里
}
```

所以 compose 的核心就是：**把每个中间件的 `next` 绑定到"下一个中间件的调用"上**。

---

## 第三步：从 dispatch 递归理解 compose

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

这就是为什么 `dispatch` 要用递归而不是简单的 `for` 循环——`for` 循环无法在"进入"和"返回"之间插入逻辑。

---

## 第四步：逐行解读核心代码

```javascript
function compose(middlewares) {
  // 参数校验
  if (!Array.isArray(middlewares)) {
    throw new TypeError('middlewares must be an array')
  }
  for (const fn of middlewares) {
    if (typeof fn !== 'function') {
      throw new TypeError('each middleware must be a function')
    }
  }

  return function (context) {
    let index = -1  // 记录当前执行到第几个中间件

    function dispatch(i) {
      // 防止 next() 被多次调用（Koa 的保护机制）
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'))
      }
      index = i

      // 越界说明所有中间件执行完毕
      let fn = middlewares[i]
      if (i === middlewares.length) {
        fn = () => Promise.resolve()
      }

      // 核心：执行当前中间件，next 就是 dispatch(i+1)
      // Promise.resolve 包装确保返回值一定是 Promise
      try {
        return Promise.resolve(fn(context, () => dispatch(i + 1)))
      } catch (err) {
        return Promise.reject(err)
      }
    }

    return dispatch(0)  // 从第一个中间件开始
  }
}
```

### 关键设计点

| 设计 | 原因 |
|------|------|
| `let index = -1` | 防止同一个中间件多次调用 `next()` |
| `Promise.resolve(fn(...))` | 兼容同步和异步中间件，统一返回 Promise |
| `fn = () => Promise.resolve()` | 最后一个中间件的 `next()` 不报错，静默结束 |
| `try/catch` | 捕获中间件同步抛出的异常 |

---

## 第五步：对比其他实现方式

### 方式 1：reduce 从后往前嵌套（等价写法）

```javascript
function compose(middlewares) {
  return function (context) {
    // 从最后一个中间件往前，逐个嵌套
    let next = () => Promise.resolve()

    // 从后往前 reduce
    for (let i = middlewares.length - 1; i >= 0; i--) {
      const fn = middlewares[i]
      const _next = next  // 保存当前的 next
      next = () => Promise.resolve(fn(context, _next))
    }

    return next()
  }
}
```

这种方式更直观地展示了"嵌套"的思想，但有一个缺点：如果中间件内部抛出同步异常，不会被 `Promise.resolve()` 捕获（因为异常发生在 `fn()` 调用时，而非 Promise 链中），需要额外加 try/catch。相比之下，递归方式的 `try/catch + Promise.reject` 组合能统一处理同步和异步异常。

### 方式 2：类 Redux 的 reduce 写法

```javascript
function compose(middlewares) {
  return middlewares.reduce((a, b) => {
    return (context, next) => {
      return a(context, () => b(context, next))
    }
  })
}
```

写法更简洁，但可读性较差，面试时建议用递归方式（第三步），思路更清晰。

> ⚠️ **注意**：此写法在 `middlewares` 为空数组时会报错，因为 `reduce` 无初始值会抛出 `TypeError`。实际使用需要先处理空数组：`if (middlewares.length === 0) return (ctx) => Promise.resolve()`。

---

## 🎯 面试追问 & 回答要点

### Q1：为什么不直接用 for 循环？

> for 循环只能"一路向前"，无法在每个中间件执行完后"返回"。洋葱模型需要在 `next()` 前后都能执行代码，必须用递归或嵌套的方式实现。

### Q2：Koa 的 compose 和 Redux 的 middleware 有什么区别？

> - **Koa**：`async (ctx, next) => { await next() }`，洋葱模型，有后半段处理
> - **Redux**：`store => next => action => { ... }`，柯里化，通过闭包持有 `next`，更侧重于"拦截 action"
> - 核心思想一致：都是将多个函数组合成一个调用链

### Q3：如何处理中间件中的错误？

> Koa 的 compose 会在最外层 try/catch，中间件中 `await next()` 会等待内层完成。如果内层抛出异常，会被 `await` 转为 rejected Promise，向外层传播。实际 Koa 还有一个 `onerror` 中间件统一处理。

### Q4：中间件的执行顺序由什么决定？

> 由 `app.use()` 注册的顺序决定。先注册的先执行（外层先执行前半部分），后注册的先返回（内层先执行后半部分）。这就是洋葱模型的精髓。

### Q5：中间件抛出异常时洋葱模型如何工作？

> 异常会沿洋葱向外传播。当中间件 B 抛出异常（或 `await next()` 的内层 rejected），B 的后半部分不会执行，控制权直接回到外层中间件 A 的 `await next()` 处，将 rejected Promise 交给 A 处理。如果 A 有 try/catch 则捕获处理，否则继续向外传播。这就是为什么 Koa 推荐在最外层中间件做统一错误处理。

### Q6：compose 的时间/空间复杂度是多少？

> - **时间复杂度**：O(n)，n 为中间件数量。compose 组合阶段 O(n)，执行阶段每个中间件恰好执行一次
> - **空间复杂度**：O(n)，dispatch 递归调用栈深度最多 n 层（实际上每层是一个 Promise 链，真正的调用栈取决于 JS 引擎的 Promise 实现）

---

## 📊 评分标准

| 得分项 | 分值 | 说明 |
|--------|------|------|
| 基本 compose 实现 | 40 分 | 能正确实现洋葱顺序 |
| async/await 处理 | 20 分 | 正确处理 Promise 链 |
| 边界处理 | 20 分 | 空数组、next 多次调用等 |
| 代码质量 | 10 分 | 注释清晰、变量命名合理 |
| 面试沟通 | 10 分 | 能解释清楚为什么这样实现 |
