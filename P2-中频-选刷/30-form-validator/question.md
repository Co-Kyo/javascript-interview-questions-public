> 🟢 **优先级：P2（中频）** — 偏系统设计/项目深挖，选刷

# 30 - 表单校验引擎

## 分类
工程实用场景

## 难度
⭐⭐⭐

## 考察点
规则组合、异步校验、错误聚合、链式调用

---

## 题目要求

实现 `FormValidator` 类，支持以下功能：

### 1. 注册校验规则

```javascript
validator.addRule(field, rules) // 返回 this，支持链式调用
```

### 2. 内置规则类型

| 规则 | 说明 | 示例 |
|------|------|------|
| `required` | 必填 | `{ type: 'required', message: '该字段必填' }` |
| `minLength` | 最小长度 | `{ type: 'minLength', value: 6, message: '至少6个字符' }` |
| `maxLength` | 最大长度 | `{ type: 'maxLength', value: 20, message: '最多20个字符' }` |
| `pattern` | 正则匹配 | `{ type: 'pattern', value: /^[\w.]+@[\w.]+$/, message: '格式不正确' }` |
| `custom` | 自定义同步函数 | `{ type: 'custom', validator: fn, message: '自定义错误' }` |
| `async` | 异步校验函数 | `{ type: 'async', validator: asyncFn, message: '异步校验失败' }` |

### 3. 执行校验

```javascript
const result = await validator.validate(formData)
// 返回 { valid: boolean, errors: { field: string[] } }
```

### 4. 约束条件

- 同步规则 **fail-fast**：遇到第一个失败即停止
- 同步全部通过后，异步规则**并行执行**
- 多字段**并行校验**
- `null`/`undefined` 值由 `required` 拦截；若无 `required`，其他规则跳过该值
- 未提供 `message` 时使用默认消息（包含字段名）

## 示例

```javascript
const validator = new FormValidator()

validator
  .addRule('email', [
    { type: 'required', message: '邮箱不能为空' },
    { type: 'pattern', value: /^[\w.]+@[\w.]+\.\w+$/, message: '邮箱格式不正确' },
  ])
  .addRule('password', [
    { type: 'required', message: '密码不能为空' },
    { type: 'minLength', value: 8, message: '密码至少8位' },
  ])

const result = await validator.validate({ email: 'test@', password: '123' })
// { valid: false, errors: { email: ['邮箱格式不正确'], password: ['密码至少8位'] } }
```
