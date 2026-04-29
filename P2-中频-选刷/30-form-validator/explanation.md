# 30 - 表单校验引擎 · 五步讲解

## 第一步：设计 API 结构

核心 API 有三个：

- `addRule(field, rules)` — 注册规则，返回 `this` 实现链式调用
- `validateField(field, value)` — 单字段校验
- `validate(formData)` — 全表单校验，返回 `{ valid, errors }`

内部用 `Map` 存储规则，key 是字段名，value 是规则数组。多次 `addRule` 同一字段时合并规则。

## 第二步：实现同步规则执行

同步规则（required、minLength、maxLength、pattern、custom）按顺序执行，采用 **fail-fast** 策略：

```
遍历规则 → 执行 → 失败？→ 立即返回错误，不继续后续规则
```

关键点：
- `required` 判空要处理 `null`、`undefined`、空字符串
- `pattern` 需要兼容 `RegExp` 对象和字符串
- `custom` 规则通过 `validator(value)` 返回 boolean

## 第三步：实现异步规则并行执行

异步规则（如远程查重、API 校验）的处理策略：

1. **同步规则优先**：先执行所有同步规则，如果同步失败则直接返回（fail-fast）
2. **异步规则并行**：同步全部通过后，用 `Promise.all` 并行执行所有异步规则
3. **错误收集**：异步规则的结果过滤出失败项，合并到错误列表

这样设计的原因：
- 同步校验是零成本的，应该先过滤掉明显不合法的值
- 异步校验（网络请求）成本高，并行执行可以显著缩短等待时间

## 第四步：实现多字段并行校验

`validate(formData)` 的核心逻辑：

```js
// 所有字段并行校验
const results = await Promise.all(
  fields.map(field => validateField(field, formData[field]))
)
```

- 每个字段独立校验，互不阻塞
- 校验完成后聚合所有错误到一个对象
- 只要有任意字段有错误，`valid` 为 `false`

## 第五步：边界处理与扩展

需要注意的边界情况：

| 场景 | 处理方式 |
|------|----------|
| 字段在 formData 中不存在 | `formData[field]` 为 `undefined`，`required` 规则会拦截 |
| `null`/`undefined` 值 | 由 `required` 规则拦截；若无 `required`，其他规则跳过该值 |
| `pattern`/`minLength`/`maxLength` 收到非字符串 | 静默跳过（返回 null），不报错 |
| 异步校验抛异常 | `try/catch` 捕获，返回兜底错误消息 |
| 未注册规则的字段 | `validateField` 返回空数组，不报错 |
| 规则类型未知 | `_runSyncRule` 的 default 分支返回 `null`，跳过该规则 |
| 默认错误消息 | 使用实际字段名（如"username 不能为空"），而非通用的"字段不能为空" |

扩展方向：
- `clearRules(field?)` — 支持清除单个或全部规则
- 超时控制 — 异步校验可加 `Promise.race` 超时
- 校验模式 — 支持 `abortEarly`（fail-fast）和 `collectAll`（收集全部错误）两种模式
