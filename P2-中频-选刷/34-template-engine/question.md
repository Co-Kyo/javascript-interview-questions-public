> 🟢 **优先级：P2（中频）** — 偏系统设计/项目深挖，选刷

# 34 - 模板引擎（简易 EJS）

## 分类
工程实用场景

## 难度
⭐⭐⭐

## 考察点
- 正则替换
- `with` 语句的作用域机制
- 字符串模板编译原理
- 沙箱与安全执行

---

## 背景

模板引擎是前端工程中最常见的工具之一。无论是 Vue 的 `{{ }}` 插值、EJS/Handlebars 的服务端渲染，还是邮件模板的动态生成，背后的核心原理都是相同的：**将模板字符串与数据对象结合，生成最终的字符串输出**。

理解模板引擎的实现原理，不仅有助于深入理解框架源码，更能在面试中展示你对正则、作用域、字符串操作等核心 JS 能力的掌握。

---

## 题目要求

请实现一个 `render(template, data)` 函数，将模板字符串中的占位符替换为实际数据。需要支持以下功能：

### 1. 变量插值
使用 `{{variable}}` 语法插入变量值，支持嵌套属性访问。

```js
render('Hello {{name}}', { name: 'World' })
// → 'Hello World'

render('{{a.b.c}}', { a: { b: { c: 'deep' } } })
// → 'deep'
```

### 2. 条件渲染
使用 `{{#if variable}}...{{/if}}` 语法进行条件渲染。当变量为真值时渲染内容，否则忽略。

```js
render('{{#if show}}visible{{/if}}', { show: true })
// → 'visible'

render('{{#if show}}visible{{/if}}', { show: false })
// → ''
```

### 3. 循环渲染
使用 `{{#each list}}...{{/each}}` 语法遍历数组。循环体内可通过 `{{this}}` 访问当前元素，通过 `{{@index}}` 访问当前索引。

```js
render('{{#each items}}{{this}},{{/each}}', { items: ['a', 'b', 'c'] })
// → 'a,b,c,'
```

### 4. 嵌套控制结构
`{{#if}}` 内部可以包含 `{{#each}}`，反之亦然。

```js
render('{{#if show}}{{#each items}}{{this}} {{/each}}{{/if}}', { show: true, items: ['x', 'y'] })
// → 'x y '
```

### 5. 变量不存在兜底
变量不存在时应输出空字符串，而非 "undefined"。

```js
render('Hello {{missing}}', {})
// → 'Hello '
```

### 6. 综合示例

```js
const template = `
<h1>{{title}}</h1>
{{#if showList}}
<ul>
  {{#each items}}
  <li>{{@index}}: {{this}}</li>
  {{/each}}
</ul>
{{/if}}
`;

const data = {
  title: 'My Page',
  showList: true,
  items: ['Apple', 'Banana', 'Cherry']
};

console.log(render(template, data));
/*
<h1>My Page</h1>

<ul>
  
  <li>0: Apple</li>
  
  <li>1: Banana</li>
  
  <li>2: Cherry</li>
  
</ul>

*/
```

---

## 约束条件

1. **不使用 `eval`**：模板的执行不能依赖 `eval` 函数（可使用 `new Function` 作为替代）
2. **支持嵌套属性访问**：`{{a.b.c}}` 应能正确解析多层嵌套对象
3. **支持嵌套控制结构**：`{{#if}}` 内部可以包含 `{{#each}}`，反之亦然
4. **空白处理**：生成结果中的换行和空格可以保留，不影响功能判断
5. **变量兜底**：变量不存在时输出空字符串，不应出现 "undefined"

---

## 追问方向

1. `with` 语句的作用是什么？它有什么缺点？为什么现代 JS 不推荐使用？
2. 如何防止模板引擎执行恶意代码（XSS 防护）？
3. 如果要实现模板编译缓存（同一模板只编译一次），你会怎么做？
4. 与 Vue 的模板编译相比，这个简易实现缺少了哪些能力？
