class FormValidator {
  constructor() {
    this.rules = new Map()
  }

  addRule(field, rules) {
    const existing = this.rules.get(field) || []
    this.rules.set(field, [...existing, ...rules])
    return this
  }

  clearRules(field) {
    if (field) {
      this.rules.delete(field)
    } else {
      this.rules.clear()
    }
    return this
  }

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

  _runSyncRule(rule, value, fieldName = '字段') {
    const { type, message } = rule
    const fieldLabel = fieldName || '字段'

    if (value === null || value === undefined) {
      if (type === 'required') {
        return message || `${fieldLabel}不能为空`
      }
      return null
    }

    switch (type) {
      case 'required': {
        const empty = typeof value === 'string' && value.trim() === ''
        return empty ? (message || `${fieldLabel}不能为空`) : null
      }

      case 'minLength': {
        if (typeof value !== 'string') return null
        return value.length < rule.value
          ? (message || `${fieldLabel}至少需要 ${rule.value} 个字符`)
          : null
      }

      case 'maxLength': {
        if (typeof value !== 'string') return null
        return value.length > rule.value
          ? (message || `${fieldLabel}最多 ${rule.value} 个字符`)
          : null
      }

      case 'pattern': {
        if (typeof value !== 'string') return null
        const regex = rule.value instanceof RegExp ? rule.value : new RegExp(rule.value)
        return !regex.test(value)
          ? (message || `${fieldLabel}格式不正确`)
          : null
      }

      case 'custom': {
        try {
          const passed = rule.validator(value)
          return passed ? null : (message || `${fieldLabel}校验失败`)
        } catch {
          return message || `${fieldLabel}校验异常`
        }
      }

      default:
        return null
    }
  }
}

module.exports = { FormValidator }
