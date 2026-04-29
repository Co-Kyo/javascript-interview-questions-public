/**
 * 27 - 中间件洋葱模型 - compose 实现
 * 
 * 类 Koa 的中间件组合函数，实现洋葱模型执行顺序。
 * 
 * 核心思想：
 *   将 [A, B, C] 三个中间件组合成 A(B(C())) 的嵌套调用链。
 *   每个中间件的 next() 实际上就是调用下一个中间件。
 *   通过递归实现"从后往前"的嵌套。
 *
 * @param {Array<(ctx: object, next: () => Promise<void>) => Promise<void>>} middlewares
 * @returns {(context: object) => Promise<void>}
 */
function compose(middlewares) {
  // 1. 参数校验：确保是数组
  if (!Array.isArray(middlewares)) {
    throw new TypeError('middlewares must be an array')
  }

  // 2. 校验每个中间件必须是函数
  for (const fn of middlewares) {
    if (typeof fn !== 'function') {
      throw new TypeError('each middleware must be a function')
    }
  }

  /**
   * 3. 返回组合后的函数
   * 接收 context（上下文），所有中间件共享同一个 context
   */
  return function (context) {
    // 4. 定义初始 dispatch：索引从 0 开始
    //    使用 Promise.resolve() 包装，确保返回 Promise
    let index = -1

    /**
     * 5. 核心：dispatch 函数
     * 每次调用 dispatch(i) 就是执行第 i 个中间件
     * 中间件内部调用 next() = dispatch(i+1)
     * 
     * 这是洋葱模型的关键：
     *   - dispatch(0) 开始执行第一个中间件
     *   - 第一个中间件调用 next() → dispatch(1) → 执行第二个中间件
     *   - 第二个中间件调用 next() → dispatch(2) → 执行第三个中间件
     *   - 第三个中间件的 next() → dispatch(3) → 无更多中间件，结束
     *   - 然后逐层返回：第三个后半 → 第二个后半 → 第一个后半
     */
    function dispatch(i) {
      // 6. 防止 next() 被多次调用
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'))
      }
      index = i

      // 7. 取出当前中间件；如果越界则说明洋葱执行完毕
      let fn = middlewares[i]
      if (i === middlewares.length) {
        // 所有中间件执行完毕，返回 resolved Promise
        fn = () => Promise.resolve()
      }

      // 8. 执行当前中间件，传入 context 和 next
      //    next 就是 dispatch(i+1)，形成递归链
      try {
        return Promise.resolve(fn(context, () => dispatch(i + 1)))
      } catch (err) {
        return Promise.reject(err)
      }
    }

    // 9. 从第一个中间件开始执行
    return dispatch(0)
  }
}

// ==================== 测试 ====================

async function test() {
  console.log('--- 测试 1：基本洋葱顺序 ---')
  const app1 = compose([
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
  await app1({})
  // 预期：A前 → B前 → C前 → C后 → B后 → A后

  console.log('\n--- 测试 2：共享上下文 ---')
  const ctx2 = {}
  const app2 = compose([
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
  await app2(ctx2)
  console.log('ctx.count:', ctx2.count) // 预期：222

  console.log('\n--- 测试 3：不调用 next ---')
  const app3 = compose([
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
  await app3({})
  // 预期：A前 → B前 → A后（C 不执行）

  console.log('\n--- 测试 4：空数组 ---')
  const app4 = compose([])
  await app4({})
  console.log('空数组正常执行')

  console.log('\n--- 测试 5：next() 多次调用 ---')
  const app5 = compose([
    async (ctx, next) => {
      await next()
      await next() // 故意多次调用
    }
  ])
  try {
    await app5({})
  } catch (e) {
    console.log('捕获错误:', e.message) // 预期：next() called multiple times
  }

  console.log('\n所有测试完成 ✅')
}

test().catch(console.error)

module.exports = compose
