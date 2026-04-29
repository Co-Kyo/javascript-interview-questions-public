> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# 27 - 中间件洋葱模型

## 📋 基本信息

| 项目 | 内容 |
|------|------|
| 分类 | 设计模式与架构 |
| 难度 | ⭐⭐⭐ |
| 考察点 | compose 函数、async 中间件链、洋葱模型、Koa 原理 |
| 时间限制 | 30 分钟 |

---

## 📖 背景

在 Koa、Redux 等框架中，中间件（Middleware）是一种核心设计模式。每个中间件可以对请求/数据进行预处理和后处理，形成 **洋葱模型（Onion Model）**：

```
请求 → 中间件A前 → 中间件B前 → 中间件C前 → 核心处理 → 中间件C后 → 中间件B后 → 中间件A后 → 响应
```

- **Koa**：`app.use(middleware)` 注册中间件，通过 `await next()` 将控制权交给下一个中间件，执行完后返回继续执行当前中间件后续代码
- **Redux**：`applyMiddleware(thunk, logger, ...)` 通过 `next(action)` 传递到下一个 middleware
- **Express**：通过 `next()` 进入下一个中间件（但不支持 async 返回值）

理解中间件的 compose 机制是掌握这些框架原理的关键。

---

## 🎯 题目要求

实现一个 `compose` 函数，接收一个中间件数组，返回一个新的函数。该函数按照洋葱模型的顺序依次执行所有中间件。

### 函数签名

```javascript
function compose(middlewares) {
  // 返回一个函数，接收 context 参数
  return function(context) {
    // ...
  }
}
```

### 中间件格式

每个中间件是一个 async 函数，接收两个参数：
- `context`：上下文对象（所有中间件共享）
- `next`：调用后进入下一个中间件

```javascript
async function middleware(context, next) {
  // next() 之前：洋葱的"进入"阶段
  console.log('中间件前半部分')
  
  await next()  // 进入下一个中间件
  
  // next() 之后：洋葱的"返回"阶段
  console.log('中间件后半部分')
}
```

---

## 📝 示例

### 示例 1：基本执行顺序

```javascript
const app = compose([
  async (ctx, next) => {
    console.log('A 前')
    await next()
    console.log('A 后')
  },
  async (ctx, next) => {
    console.log('B 前')
    await next()
    console.log('B 后')
  },
  async (ctx, next) => {
    console.log('C 前')
    await next()
    console.log('C 后')
  }
])

const ctx = {}
await app(ctx)

// 输出顺序：
// A 前
// B 前
// C 前
// C 后
// B 后
// A 后
```

### 示例 2：共享上下文

```javascript
const app = compose([
  async (ctx, next) => {
    ctx.count = 1
    await next()
    ctx.count *= 2
  },
  async (ctx, next) => {
    ctx.count += 10
    await next()
  },
  async (ctx, next) => {
    ctx.count += 100
    await next()
  }
])

const ctx = {}
await app(ctx)
console.log(ctx.count) // 输出：222
// 计算过程：
//   最内层: count = 0 + 100 = 100
//   中间层: count = 100 + 10 = 110
//   最外层设置: count = 1（覆盖之前的值）
//   最外层 next() 返回后: count = 1 * 2 = 2 → 等等
// 实际执行顺序（从内到外初始化，从外到内回溯）：
//   外层: ctx.count = 1 → 调用 next()
//   中间层: ctx.count += 10 → 1+10=11 → 调用 next()
//   内层: ctx.count += 100 → 11+100=111 → next() 返回
//   中间层回溯: 无操作 → 返回
//   外层回溯: ctx.count *= 2 → 111*2 = 222
```

### 示例 3：不调用 next()

```javascript
const app = compose([
  async (ctx, next) => {
    console.log('A 前')
    await next()
    console.log('A 后')
  },
  async (ctx, next) => {
    console.log('B 前')
    // 不调用 next()，中断洋葱
  },
  async (ctx, next) => {
    console.log('C 前')
    await next()
    console.log('C 后')
  }
])

await app({})

// 输出：
// A 前
// B 前
// A 后
// 注意：C 完全不执行
```

### 示例 4：错误传播

```javascript
const app = compose([
  async (ctx, next) => {
    console.log('A 前')
    try {
      await next()
    } catch (e) {
      console.log('A 捕获错误:', e.message)
      ctx.error = e.message
    }
    console.log('A 后')
  },
  async (ctx, next) => {
    console.log('B 前')
    throw new Error('B 出错了')
  },
  async (ctx, next) => {
    console.log('C 前')
    await next()
    console.log('C 后')
  }
])

const ctx = {}
await app(ctx)
console.log('ctx.error:', ctx.error)

// 输出：
// A 前
// B 前
// A 捕获错误: B 出错了
// A 后
// ctx.error: B 出错了
// 注意：B 抛出异常后，C 不执行，异常沿洋葱向外传播，被 A 的 try/catch 捕获
```

---

## ✅ 约束条件

1. 中间件数组可能为空，需返回一个可调用的函数
2. 每个中间件都是 `async function(ctx, next)` 格式
3. `next()` 返回 Promise，需要 `await` 等待
4. 最后一个中间件调用 `next()` 时应正常结束（不报错）
5. 不允许使用 `for` 循环简单遍历（需体现递归/嵌套调用的洋葱特性）

---

## 🧪 验证用例

请用以下用例验证你的实现：

```javascript
// 用例 1：空数组
const empty = compose([])
await empty({}) // 应正常执行，不报错

// 用例 2：单个中间件
const single = compose([
  async (ctx, next) => {
    ctx.value = 1
    await next()
    ctx.value += 1
  }
])
const ctx1 = {}
await single(ctx1)
console.log(ctx1.value) // 应输出 2

// 用例 3：洋葱顺序 + 上下文共享
const ctx3 = {}
const app = compose([
  async (ctx, next) => { ctx.order = ['A1']; await next(); ctx.order.push('A2') },
  async (ctx, next) => { ctx.order.push('B1'); await next(); ctx.order.push('B2') },
  async (ctx, next) => { ctx.order.push('C1'); await next(); ctx.order.push('C2') }
])
await app(ctx3)
console.log(ctx3.order) // 应输出 ['A1', 'B1', 'C1', 'C2', 'B2', 'A2']

// 用例 4：async 操作
const app4 = compose([
  async (ctx, next) => {
    ctx.start = Date.now()
    await next()
    ctx.cost = Date.now() - ctx.start
  },
  async (ctx, next) => {
    await new Promise(r => setTimeout(r, 100))
    await next()
  }
])
const ctx4 = {}
await app4(ctx4)
console.log(ctx4.cost >= 100) // 应输出 true
```

---

## 💡 提示（实在想不出再看）

<details>
<summary>提示 1</summary>
考虑如何将中间件数组"从后往前"嵌套起来
</details>

<details>
<summary>提示 2</summary>
每个中间件的 `next` 其实就是下一个中间件的调用
</details>

<details>
<summary>提示 3</summary>
可以使用递归或 reduce 来实现
</details>
