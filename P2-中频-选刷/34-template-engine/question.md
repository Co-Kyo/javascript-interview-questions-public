> 🟢 **优先级：P2（中频）** — 偏系统设计/项目深挖，选刷

# 34 - 模板引擎（简易 EJS）

## 分类
工程实用场景

## 难度
⭐⭐⭐

## 考察点
正则替换、`with` 语句的作用域机制、字符串模板编译原理

---

## 题目要求

实现 `render(template, data, options)` 函数，将模板字符串中的占位符替换为实际数据。

### 1. 变量插值

`{{variable}}` 语法，支持嵌套属性访问（`{{a.b.c}}`）。

### 2. 条件渲染

`{{#if variable}}...{{/if}}`，变量为真值时渲染，否则忽略。

### 3. 循环渲染

`{{#each list}}...{{/each}}`，循环体内 `{{this}}` 访问当前元素，`{{@index}}` 访问当前索引。

### 4. 嵌套控制结构

`{{#if}}` 内部可以包含 `{{#each}}`，反之亦然。

### 5. XSS 防护

默认开启 HTML 转义（`&<>"'`），可通过 `options.escape = false` 关闭。

### 6. 变量不存在兜底

变量不存在时输出空字符串，而非 "undefined"。

## 示例

```javascript
render('Hello {{name}}', { name: 'World' })
// → 'Hello World'

render('{{#if show}}visible{{/if}}', { show: true })
// → 'visible'

render('{{#each items}}{{this}},{{/each}}', { items: ['a', 'b', 'c'] })
// → 'a,b,c,'

render('{{#if show}}{{#each items}}{{this}} {{/each}}{{/if}}', { show: true, items: ['x', 'y'] })
// → 'x y '
```

## 约束条件

1. **不使用 `eval`**（可使用 `new Function`）
2. 支持嵌套属性访问 `{{a.b.c}}`
3. 支持嵌套控制结构
4. 变量不存在时输出空字符串
