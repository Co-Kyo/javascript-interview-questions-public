const { FormValidator } = require('./solution.js')

async function runTests() {
  // 测试1: required 规则
  {
    const v = new FormValidator()
    v.addRule('name', [{ type: 'required', message: '姓名不能为空' }])
    const r = await v.validate({})
    console.assert(r.valid === false, 'required: valid=false')
    console.assert(r.errors.name[0] === '姓名不能为空', 'required: 错误消息')
  }

  // 测试2: minLength + maxLength
  {
    const v = new FormValidator()
    v.addRule('password', [
      { type: 'minLength', value: 6, message: '密码至少6位' },
      { type: 'maxLength', value: 20, message: '密码最多20位' },
    ])
    const r1 = await v.validate({ password: '123' })
    console.assert(r1.valid === false, 'minLength 失败')
    console.assert(r1.errors.password[0] === '密码至少6位', 'minLength 错误消息')

    const r2 = await v.validate({ password: 'a'.repeat(21) })
    console.assert(r2.valid === false, 'maxLength 失败')

    const r3 = await v.validate({ password: '123456' })
    console.assert(r3.valid === true, '长度在范围内')
  }

  // 测试3: pattern 规则
  {
    const v = new FormValidator()
    v.addRule('email', [
      { type: 'pattern', value: /^[\w.]+@[\w.]+\.\w+$/, message: '邮箱格式不正确' },
    ])
    const r1 = await v.validate({ email: 'test@' })
    console.assert(r1.valid === false, 'pattern 失败')

    const r2 = await v.validate({ email: 'test@example.com' })
    console.assert(r2.valid === true, 'pattern 通过')
  }

  // 测试4: custom 规则
  {
    const v = new FormValidator()
    v.addRule('age', [
      {
        type: 'custom',
        validator: (val) => val >= 18 && val <= 100,
        message: '年龄必须在 18-100 之间',
      },
    ])
    const r1 = await v.validate({ age: 10 })
    console.assert(r1.valid === false, 'custom 失败')

    const r2 = await v.validate({ age: 25 })
    console.assert(r2.valid === true, 'custom 通过')
  }

  // 测试5: async 规则
  {
    const v = new FormValidator()
    v.addRule('username', [
      { type: 'required' },
      {
        type: 'async',
        validator: async (value) => {
          return !['admin', 'root'].includes(value)
        },
        message: '用户名已被占用',
      },
    ])
    const r1 = await v.validate({ username: 'admin' })
    console.assert(r1.valid === false, 'async 规则失败')
    console.assert(r1.errors.username.includes('用户名已被占用'), 'async 错误消息')

    const r2 = await v.validate({ username: 'alice' })
    console.assert(r2.valid === true, 'async 规则通过')
  }

  // 测试6: fail-fast（同步规则）
  {
    const v = new FormValidator()
    v.addRule('field', [
      { type: 'required', message: '必填' },
      { type: 'minLength', value: 10, message: '至少10字符' },
    ])
    const r = await v.validate({ field: '' })
    console.assert(r.errors.field.length === 1, 'fail-fast: 只返回第一个错误')
    console.assert(r.errors.field[0] === '必填', 'fail-fast: 返回 required 错误')
  }

  // 测试7: 链式调用
  {
    const v = new FormValidator()
    const result = v
      .addRule('a', [{ type: 'required' }])
      .addRule('b', [{ type: 'required' }])
    console.assert(result === v, 'addRule 返回 this')
  }

  // 测试8: 多字段并行校验
  {
    const v = new FormValidator()
    v.addRule('email', [{ type: 'required', message: '邮箱必填' }])
    v.addRule('password', [{ type: 'required', message: '密码必填' }])
    const r = await v.validate({})
    console.assert(r.valid === false, '多字段校验失败')
    console.assert('email' in r.errors, 'email 有错误')
    console.assert('password' in r.errors, 'password 有错误')
  }

  // 测试9: null/undefined 值处理
  {
    const v = new FormValidator()
    v.addRule('name', [{ type: 'required', message: '必填' }])
    const r1 = await v.validate({ name: null })
    console.assert(r1.valid === false, 'null 值 required 拦截')

    const v2 = new FormValidator()
    v2.addRule('name', [{ type: 'minLength', value: 3 }])
    const r2 = await v2.validate({ name: null })
    console.assert(r2.valid === true, 'null 值无 required 则跳过')
  }

  // 测试10: clearRules
  {
    const v = new FormValidator()
    v.addRule('a', [{ type: 'required' }])
    v.addRule('b', [{ type: 'required' }])
    v.clearRules('a')
    const r1 = await v.validate({ b: 'ok' })
    console.assert(r1.valid === true, 'clearRules 单字段')

    v.clearRules()
    const r2 = await v.validate({})
    console.assert(r2.valid === true, 'clearRules 全部')
  }

  // 测试11: 默认错误消息
  {
    const v = new FormValidator()
    v.addRule('username', [{ type: 'required' }])
    const r = await v.validate({})
    console.assert(r.errors.username[0] === 'username不能为空', '默认消息包含字段名')
  }

  // 测试12: validateField 单字段校验
  {
    const v = new FormValidator()
    v.addRule('x', [{ type: 'required' }])
    const r = await v.validateField('x', '')
    console.assert(r.length === 1, 'validateField 返回错误数组')
    const r2 = await v.validateField('nonexistent', '')
    console.assert(r2.length === 0, '未注册字段返回空数组')
  }

  console.log('✅ 全部通过')
}

runTests().catch(console.error)
