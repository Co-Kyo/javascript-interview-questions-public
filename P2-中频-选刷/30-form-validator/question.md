> 🟢 **优先级：P2（中频）** — 偏系统设计/项目深挖，选刷

# 30 - 表单校验引擎

## 基本信息

- **分类**：工程实用场景
- **难度**：⭐⭐⭐
- **考察点**：规则组合、异步校验、错误聚合、链式调用

## 背景

表单校验是中后台系统（如 AntD、Element UI）中最常见的交互之一。底层表单校验引擎需要：

- 支持多种规则类型的组合（必填、长度、正则、自定义函数、异步校验）
- 支持对多个字段并行校验
- 聚合所有字段的错误信息
- 提供简洁的链式调用 API

本题要求实现一个轻量级但功能完整的 `FormValidator` 类。

## 题目要求

实现 `FormValidator` 类，具备以下能力：

### 1. 注册校验规则

```js
validator.addRule(field, rules)
```

- `field`：字段名（字符串）
- `rules`：规则数组，每个规则是一个对象或函数

### 2. 内置规则类型

| 规则 | 说明 | 示例 |
|------|------|------|
| `required` | 必填 | `{ type: 'required', message: '该字段必填' }` |
| `minLength` | 最小长度 | `{ type: 'minLength', value: 6, message: '至少6个字符' }` |
| `maxLength` | 最大长度 | `{ type: 'maxLength', value: 20, message: '最多20个字符' }` |
| `pattern` | 正则匹配 | `{ type: 'pattern', value: /^[\w.]+@[\w.]+$/, message: '邮箱格式不正确' }` |
| `custom` | 自定义同步函数 | `{ type: 'custom', validator: fn, message: '自定义错误' }` |
| `async` | 异步校验函数 | `{ type: 'async', validator: asyncFn, message: '异步校验失败' }` |

### 3. 执行校验

```js
const result = await validator.validate(formData)
```

- `formData`：对象，key 为字段名，value 为字段值
- 返回 `{ valid: boolean, errors: { field: string[] } }`

### 4. 约束条件

- 同一字段的多个**同步**规则按顺序执行，**遇到第一个失败即停止**（fail-fast）
- 异步规则与同步规则混合时，同步规则先执行；同步全部通过后，异步规则**并行执行**（收集所有异步错误）
- `validate()` 返回的 Promise，所有字段的校验**并行执行**
- 支持自定义错误消息
- `null`/`undefined` 值由 `required` 规则拦截；若无 `required` 规则，`minLength`/`maxLength`/`pattern` 跳过该值

## 示例

```js
const validator = new FormValidator()

validator
  .addRule('email', [
    { type: 'required', message: '邮箱不能为空' },
    { type: 'pattern', value: /^[\w.]+@[\w.]+\.\w+$/, message: '邮箱格式不正确' },
  ])
  .addRule('password', [
    { type: 'required', message: '密码不能为空' },
    { type: 'minLength', value: 8, message: '密码至少8位' },
    { type: 'maxLength', value: 20, message: '密码最多20位' },
  ])
  .addRule('username', [
    { type: 'required' },  // 未提供 message 时使用默认消息："{fieldName}不能为空"
    {
      type: 'async',
      validator: async (value) => {
        // 模拟远程查重
        const taken = ['admin', 'root'].includes(value)
        return !taken
      },
      message: '用户名已被占用',
    },
  ])

// 示例 1：多字段校验失败
const result = await validator.validate({
  email: 'test@',
  password: '123',
  username: 'admin',
})
console.log(result)
// {
//   valid: false,
//   errors: {
//     email: ['邮箱格式不正确'],
//     password: ['密码至少8位'],
//     username: ['用户名已被占用'],
//   }
// }

// 示例 2：字段缺失（required 拦截）
const result2 = await validator.validate({})
console.log(result2)
// {
//   valid: false,
//   errors: {
//     email: ['邮箱不能为空'],
//     password: ['密码不能为空'],
//     username: ['username 不能为空'],  // 默认消息包含字段名
//   }
// }

// 示例 3：null 值处理
// null/undefined 由 required 规则拦截；若无 required 规则则跳过其他校验
```

## 加分项

- 支持链式调用 `addRule`（返回 `this`）
- 支持 `clearRules(field?)` 清除指定字段或全部规则
- 支持 `validateField(field, value)` 单字段校验
- 异步校验支持超时控制

## 评分标准

| 等级 | 要求 |
|------|------|
| 及格 | 实现 required、minLength、maxLength、pattern 四种规则，`validate()` 正确返回 |
| 良好 | 补充自定义函数规则和 async 规则，支持链式调用 |
| 优秀 | 并行校验、fail-fast 逻辑正确、错误聚合完整、边界处理健壮 |
