/**
 * FormValidator - 表单校验引擎
 * 支持同步 + 异步规则，链式调用，fail-fast，错误聚合
 */

class FormValidator {
  constructor() {
    // field -> rules[]
    this.rules = new Map()
  }

  /**
   * 链式注册校验规则
   * @param {string} field - 字段名
   * @param {Array} rules - 规则数组
   * @returns {FormValidator} this（支持链式调用）
   */
  addRule(field, rules) {
    // 合并同一字段的多次 addRule 调用
    const existing = this.rules.get(field) || []
    this.rules.set(field, [...existing, ...rules])
    return this // 链式调用关键
  }

  /**
   * 清除规则
   * @param {string} [field] - 不传则清除全部
   */
  clearRules(field) {
    if (field) {
      this.rules.delete(field)
    } else {
      this.rules.clear()
    }
    return this
  }

  /**
   * 校验单个字段（同步规则 fail-fast + 异步规则并行）
   * @param {string} field
   * @param {*} value
   * @returns {Promise<string[]>} 错误消息数组
   */
  async validateField(field, value) {
    const rules = this.rules.get(field)
    if (!rules) return []

    const errors = []
    const asyncTasks = []

    for (const rule of rules) {
      // 异步规则收集起来稍后并行执行
      if (rule.type === 'async') {
        asyncTasks.push(rule)
        continue
      }

      // 同步规则立即执行，失败则 fail-fast
      const err = this._runSyncRule(rule, value, field)
      if (err) {
        errors.push(err)
        return errors // fail-fast：同步失败直接返回
      }
    }

    // 所有同步规则通过后，并行执行异步规则
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

  /**
   * 执行校验（所有字段并行）
   * @param {Object} formData - { field: value }
   * @returns {Promise<{ valid: boolean, errors: Object }>}
   */
  async validate(formData) {
    const fields = Array.from(this.rules.keys())

    // 所有字段并行校验
    const results = await Promise.all(
      fields.map(async (field) => {
        const value = formData[field]
        const errors = await this.validateField(field, value)
        return { field, errors }
      })
    )

    // 聚合错误
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

  /**
   * 执行单条同步规则
   * @param {Object} rule
   * @param {*} value
   * @returns {string|null} 错误消息或 null
   */
  _runSyncRule(rule, value, fieldName = '字段') {
    const { type, message } = rule
    const fieldLabel = fieldName || '字段'

    // null/undefined 除 required 外统一交由 required 处理
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
