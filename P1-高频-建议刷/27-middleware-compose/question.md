> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# 27 - 中间件洋葱模型

## 分类
设计模式与架构

## 难度
⭐⭐⭐

## 考察点
compose 函数、async 中间件链、洋葱模型、Koa 原理

---

## 题目要求

实现一个 `compose` 函数，接收一个中间件数组，返回一个新的函数。该函数按照洋葱模型的顺序依次执行所有中间件。

每个中间件是 `async function(context, next)` 格式，`next()` 调用后进入下一个中间件。

```javascript
function compose(middlewares) {
  return function(context) { /* ... */ }
}
```

## 示例

```javascript
const app = compose([
  async (ctx, next) => { console.log('A 前'); await next(); console.log('A 后') },
  async (ctx, next) => { console.log('B 前'); await next(); console.log('B 后') },
  async (ctx, next) => { console.log('C 前'); await next(); console.log('C 后') },
])

await app({})
// 输出：A 前 → B 前 → C 前 → C 后 → B 后 → A 后
```

```javascript
// 共享上下文
const ctx = {}
const app = compose([
  async (ctx, next) => { ctx.count = 1; await next(); ctx.count *= 2 },
  async (ctx, next) => { ctx.count += 10; await next() },
  async (ctx, next) => { ctx.count += 100; await next() },
])
await app(ctx)
console.log(ctx.count) // 222
```

## 约束条件

1. 中间件数组可能为空，需返回一个可调用的函数
2. `next()` 返回 Promise，需要 `await` 等待
3. 最后一个中间件调用 `next()` 时应正常结束（不报错）
4. 同一中间件多次调用 `next()` 应抛出错误
