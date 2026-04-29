# 34 - 模板引擎 详解

## 五步讲解

---

### 第一步：理解核心问题

模板引擎的本质是一个**字符串替换器**。给定模板字符串和数据对象，它需要：

1. 识别模板中的特殊语法（`{{}}`、`{{#if}}`、`{{#each}}`）
2. 从数据对象中取出对应的值
3. 将值替换回模板，生成最终字符串

关键难点在于：如何让模板中的 `name` 直接访问 `data.name`，而不是写 `data['name']`？

---

### 第二步：用 `with` 语句建立数据作用域

`with(obj)` 是 JS 中一个被遗忘（且被严格模式禁止）的语句，它做的事情很巧妙：

```js
const data = { name: 'World', age: 25 };

with (data) {
  console.log(name); // 'World' —— 不需要写 data.name
  console.log(age);  // 25
}
```

**原理**：`with` 会将对象的属性临时注入到当前作用域链中。当你访问 `name` 时，JS 引擎先在局部找，找不到就去 `data` 对象上找。

**嵌套属性也自然支持**：`with(data)` 后访问 `a.b.c` 等价于 `data.a.b.c`，因为 JS 引擎会沿着属性链逐层解析。

**为什么 `with` 被禁止？**
- 性能问题：引擎无法在编译时确定变量来自哪个作用域，无法优化
- 可读性差：变量来源不明确，容易出 bug
- 严格模式下直接报错

但在模板引擎这个场景下，`with` 恰好是最佳选择——我们就是要动态建立作用域。

---

### 第三步：正则解析模板语法

模板中的三种语法用不同的正则匹配：

| 语法 | 正则 | 处理方式 |
|------|------|----------|
| `{{var}}` | `/\{\{(.*?)\}\}/g` | 替换为变量值 |
| `{{#if var}}` | `/\{\{#if\s+(\w+)\}\}/` | 转为 `if(var){` |
| `{{#each list}}` | `/\{\{#each\s+(\w+)\}\}/` | 转为 `for` 循环 |
| `{{/if}}` / `{{/each}}` | 固定字符串匹配 | 转为 `}` |

**核心正则解析流程**（以 `pushLine` 为例）：

```
输入: "Hello {{name}}, age: {{age}}"

split(/\{\{(.*?)\}\}/)
→ ["Hello ", "name", ", age: ", "age", ""]

偶数位(0,2,4) = 普通文本
奇数位(1,3)   = 表达式

生成代码:
__r.push('Hello '); __r.push(name); __r.push(', age: '); __r.push(age);
```

**关键细节**：用 `split` 配合捕获组，一次调用就能同时得到文本和表达式，比手动 `exec` 循环更简洁。

---

### 第四步：生成可执行函数

将解析结果拼接成一个完整的函数体。以下是实际生成代码的简化示例：

```js
// 假设模板: <h1>{{title}}</h1>\n{{#if showList}}\n<ul>\n{{#each items}}\n<li>{{this}}</li>\n{{/each}}\n</ul>\n{{/if}}
// 实际生成的代码（简化）:

with (__data) {
  var __r = [];
  __r.push('<h1>'); __r.push(title); __r.push('</h1>');
  __r.push('\n');
  if (showList) {
    __r.push('<ul>');
    __r.push('\n');
    var __arr = items;
    for (var __i = 0; __i < __arr.length; __i++) {
      __r.push('<li>'); __r.push(__arr[__i]); __r.push('</li>');
      __r.push('\n');
    }
    __r.push('</ul>');
  }
  return __r.join('');
}
```

关键点：
- `{{this}}` 在循环体内被替换为 `__arr[__i]`（当前元素）
- `{{@index}}` 被替换为 `__i`（当前索引）
- 普通变量如 `{{title}}` 直接用变量名，靠 `with` 从数据对象中取值

然后用 `new Function('__data', code)` 创建函数：

```js
const fn = new Function('__data', code);
return fn(data); // 执行，传入实际数据
```

**为什么用 `new Function` 而不是 `eval`？**
- `new Function` 创建的是独立函数，有自己的作用域，不会污染外部
- `eval` 会在当前作用域执行，可能访问和修改外部变量
- 面试约束要求不使用 `eval`，`new Function` 是合规替代

---

### 第五步：边界处理与安全考量

#### XSS 防护（已内置）

默认开启 HTML 转义，防止 `<script>` 等注入：

```js
// 内置的转义函数（注入到生成代码中）
function __esc(s) {
  var s = String(s),
    m = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
  return s.replace(/[&<>"']/g, function (c) { return m[c]; });
}

// 使用示例
render('<div>{{content}}</div>', { content: '<script>alert("xss")</script>' });
// → '<div>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>'

// 如需关闭转义（如渲染可信 HTML）
render('<b>{{name}}</b>', { name: 'Tom' }, { escape: false });
// → '<b>Tom</b>'
```

#### 变量不存在兜底

变量不存在时输出空字符串而非 "undefined"：

```js
// 生成的代码使用 typeof 检查
(typeof name !== 'undefined' ? name : '')

// 测试
render('Hello {{missing}}', {});
// → 'Hello '
```

#### 编译缓存（进阶优化）

```js
const cache = {};
function render(template, data) {
  if (!cache[template]) {
    cache[template] = compile(template); // 只编译一次
  }
  return cache[template](data);
}
```

#### 更安全的沙箱

`with` + `new Function` 仍然可以让模板访问全局对象（如 `window`、`document`）。真正的沙箱需要：
- 使用 `Proxy` 拦截属性访问
- 限制可访问的全局白名单
- 或者用 AST 解析替代直接执行

#### 嵌套循环局限

当前实现中循环使用硬编码变量名 `__arr` 和 `__i`，因此不支持 `{{#each}}` 嵌套 `{{#each}}`。如需支持，需改用栈结构或生成唯一变量名。

---

## 总结

```
模板字符串
    ↓ 正则解析（split + 捕获组）
Token 流（文本 + 表达式 + 控制语句）
    ↓ 代码生成（pushLine + 控制结构）
可执行函数体（with + push + __esc 转义）
    ↓ new Function
最终渲染结果
```

这道题考察的不只是正则能力，更是对 JS 执行模型（作用域链、`with`、`Function` 构造器）的深入理解。能清晰讲出 `with` 的利弊和 `new Function` vs `eval` 的区别，是加分项。
