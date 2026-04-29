const compose = require('./solution.js')

async function runTests() {
  // 基本洋葱顺序
  const order = []
  const app1 = compose([
    async (ctx, next) => { order.push('A1'); await next(); order.push('A2') },
    async (ctx, next) => { order.push('B1'); await next(); order.push('B2') },
    async (ctx, next) => { order.push('C1'); await next(); order.push('C2') },
  ])
  await app1({})
  console.assert(order.join(',') === 'A1,B1,C1,C2,B2,A2', '基本洋葱顺序')

  // 共享上下文
  const ctx2 = {}
  const app2 = compose([
    async (ctx, next) => { ctx.count = 1; await next(); ctx.count *= 2 },
    async (ctx, next) => { ctx.count += 10; await next() },
    async (ctx, next) => { ctx.count += 100; await next() },
  ])
  await app2(ctx2)
  console.assert(ctx2.count === 222, '共享上下文: ' + ctx2.count)

  // 不调用 next 中断洋葱
  const order3 = []
  const app3 = compose([
    async (ctx, next) => { order3.push('A1'); await next(); order3.push('A2') },
    async (ctx, next) => { order3.push('B1') },
    async (ctx, next) => { order3.push('C1'); await next(); order3.push('C2') },
  ])
  await app3({})
  console.assert(order3.join(',') === 'A1,B1,A2', '不调用 next 中断')

  // 空数组
  const app4 = compose([])
  await app4({})
  console.assert(true, '空数组正常执行')

  // next() 多次调用应抛错
  const app5 = compose([
    async (ctx, next) => { await next(); await next() },
  ])
  try {
    await app5({})
    console.assert(false, 'next() 多次调用应抛错')
  } catch (e) {
    console.assert(e.message === 'next() called multiple times', 'next() 多次调用抛错: ' + e.message)
  }

  // 单个中间件
  const ctx6 = {}
  const app6 = compose([
    async (ctx, next) => { ctx.value = 1; await next(); ctx.value += 1 },
  ])
  await app6(ctx6)
  console.assert(ctx6.value === 2, '单个中间件: ' + ctx6.value)

  // 参数校验
  try {
    compose('not-array')
    console.assert(false, '非数组应抛 TypeError')
  } catch (e) {
    console.assert(e instanceof TypeError, '非数组抛 TypeError')
  }

  try {
    compose([1, 2, 3])
    console.assert(false, '非函数元素应抛 TypeError')
  } catch (e) {
    console.assert(e instanceof TypeError, '非函数元素抛 TypeError')
  }

  console.log('✅ 全部通过')
}

runTests().catch(console.error)
