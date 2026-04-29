# 30 - 表单校验引擎 - 讲解

## 第一步：理解问题

表单校验引擎的核心是**规则组合 + 错误聚合**。需要支持多种规则类型（required、minLength、maxLength、pattern、custom、async），并且：

- 同步规则 **fail-fast**：遇到第一个失败就停止，不浪费时间继续校验
- 异步规则 **并行执行**：用 `Promise.all` 同时执行，缩短等待时间
- 多字段 **并行校验**：所有字段独立校验，互不阻塞

---

## 第二步：核心思路

API 设计：
- `addRule(field, rules)` — 注册规则，返回 `this` 支持链式调用
- `validateField(field, value)` — 单字段校验
- `validate(formData)` — 全表单校验，返回 `{ valid, errors }`

内部用 `Map` 存储规则，key 是字段名，value 是规则数组。多次 `addRule` 同一字段时合并规则。

---

## 第三步：逐步实现

### 3.1 规则注册与链式调用

```javascript
class FormValidator {
  constructor() {
    this.rules = new Map()
  }

  addRule(field, rules) {
    const existing = this.rules.get(field) || []
    this.rules.set(field, [...existing, ...rules])
    return this
  }
```

**`return this`**：链式调用的关键。每次 `addRule` 返回自身，支持 `validator.addRule('a', [...]).addRule('b', [...])`。

### 3.2 单字段校验 — 同步 fail-fast + 异步并行

```javascript
  async validateField(field, value) {
    const rules = this.rules.get(field)
    if (!rules) return []

    const errors = []
    const asyncTasks = []

    for (const rule of rules) {
      if (rule.type === 'async') {
        asyncTasks.push(rule)
        continue
      }

      const err = this._runSyncRule(rule, value, field)
      if (err) {
        errors.push(err)
        return errors
      }
    }
```

同步规则按顺序执行，失败立即返回（fail-fast）。异步规则收集起来稍后并行执行。

```javascript
    if (asyncTasks.length > 0) {
      const results = await Promise.all(
        asyncTasks.map(async (rule) => {
          try {
            const passed = await rule.validator(value)
            return passed ? null : (rule.message || `${field} 异步校验失败`)
          } catch {
            return rule.message || `${field} 异步校验异常`
          }
        })
      )
      errors.push(...results.filter(Boolean))
    }

    return errors
  }
```

同步全部通过后，用 `Promise.all` 并行执行所有异步规则。`filter(Boolean)` 过滤掉通过的规则（null）。

### 3.3 全表单校验 — 多字段并行

```javascript
  async validate(formData) {
    const fields = Array.from(this.rules.keys())

    const results = await Promise.all(
      fields.map(async (field) => {
        const value = formData[field]
        const errors = await this.validateField(field, value)
        return { field, errors }
      })
    )

    const errors = {}
    let valid = true
    for (const { field, errors: fieldErrors } of results) {
      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors
        valid = false
      }
    }

    return { valid, errors }
  }
```

所有字段用 `Promise.all` 并行校验，完成后聚合错误。

### 3.4 同步规则执行器

```javascript
  _runSyncRule(rule, value, fieldName = '字段') {
    const { type, message } = rule
    const fieldLabel = fieldName || '字段'

    if (value === null || value === undefined) {
      if (type === 'required') {
        return message || `${fieldLabel}不能为空`
      }
      return null
    }
```

**null/undefined 处理**：只有 `required` 规则会拦截空值，其他规则静默跳过。这样设计的原因是：如果没有 `required` 规则，说明字段是可选的，可选字段的 `minLength` 等规则不应在校验空值时报错。

```javascript
    switch (type) {
      case 'required': {
        const empty = typeof value === 'string' && value.trim() === ''
        return empty ? (message || `${fieldLabel}不能为空`) : null
      }
      case 'minLength': {
        if (typeof value !== 'string') return null
        return value.length < rule.value
          ? (message || `${fieldLabel}至少需要 ${rule.value} 个字符`) : null
      }
      case 'pattern': {
        if (typeof value !== 'string') return null
        const regex = rule.value instanceof RegExp ? rule.value : new RegExp(rule.value)
        return !regex.test(value) ? (message || `${fieldLabel}格式不正确`) : null
      }
      case 'custom': {
        try {
          const passed = rule.validator(value)
          return passed ? null : (message || `${fieldLabel}校验失败`)
        } catch {
          return message || `${fieldLabel}校验异常`
        }
      }
      default: return null
    }
  }
}
```

每种规则类型独立处理，返回错误消息或 null。`pattern` 兼容 `RegExp` 对象和字符串。

---

## 第四步：常见追问

### Q1：为什么同步规则用 fail-fast 而不是收集全部？

fail-fast 策略更高效——`required` 失败后不需要继续检查 `minLength`。面试中可以提到支持两种模式（`abortEarly` vs `collectAll`）作为加分项。

### Q2：异步规则为什么并行而不是串行？

异步规则通常是网络请求（如远程查重），并行执行可以显著缩短等待时间。如果 3 个异步规则各需 200ms，并行只需 200ms，串行需要 600ms。

### Q3：如何实现超时控制？

用 `Promise.race` 包装异步规则：

```javascript
const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])
```

---

## 第五步：易错点

| 易错点 | 说明 |
|-------|------|
| 同步规则不 fail-fast | 遇到第一个失败应立即返回 |
| 异步规则串行执行 | 应用 `Promise.all` 并行 |
| null/undefined 不特殊处理 | 只有 required 拦截空值，其他规则应跳过 |
| 不支持链式调用 | `addRule` 应返回 `this` |
| 异步校验不 try/catch | 网络请求可能失败，需要兜底 |
| 默认错误消息不含字段名 | 应包含实际字段名，如 "username不能为空" |
