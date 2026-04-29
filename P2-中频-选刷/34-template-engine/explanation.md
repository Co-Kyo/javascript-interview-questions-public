# 34 - 模板引擎 - 讲解

## 第一步：理解问题

模板引擎的本质是**字符串替换器**。给定模板字符串和数据对象，需要：

1. 识别模板中的特殊语法（`{{}}`、`{{#if}}`、`{{#each}}`）
2. 从数据对象中取出对应的值
3. 将值替换回模板，生成最终字符串

关键难点：如何让模板中的 `name` 直接访问 `data.name`？答案是 `with` 语句。

---

## 第二步：核心思路

整体流程：

```
模板字符串 → 正则解析 → Token 流 → 代码生成 → new Function 执行 → 最终结果
```

- 用 `split(/\{\{(.*?)\}\}/)` 一次调用同时得到文本和表达式
- 用 `with` 语句建立数据作用域，让模板变量直接访问数据属性
- 用 `new Function` 而非 `eval` 创建独立函数，避免污染外部作用域

---

## 第三步：逐步实现

### 3.1 pushLine — 行内变量替换

```javascript
function pushLine(line, escape) {
  const parts = line.split(/\{\{(.*?)\}\}/);
  const codes = [];

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      const text = parts[i];
      if (text) {
        codes.push(`__r.push('${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')`);
      }
    } else {
      const expr = parts[i].trim();
      let valCode;

      if (expr === 'this') {
        valCode = '__arr[__i]';
      } else if (expr === '@index') {
        valCode = '__i';
      } else if (expr.startsWith('@')) {
        codes.push("__r.push('')");
        continue;
      } else {
        valCode = `(typeof ${expr}!=='undefined'?${expr}:'')`;
      }

      if (escape) {
        codes.push(`__r.push(__esc(${valCode}))`);
      } else {
        codes.push(`__r.push(${valCode})`);
      }
    }
  }

  return codes.join(';');
}
```

**`split(/\{\{(.*?)\}\}/)` 配合捕获组**：偶数位是普通文本，奇数位是表达式。比手动 `exec` 循环更简洁。

**`{{this}}` → `__arr[__i]`**：循环体内 `this` 指向当前元素，映射为数组下标访问。

**`typeof expr !== 'undefined'` 兜底**：变量不存在时输出空字符串，而非 "undefined"。

### 3.2 render — 主函数

```javascript
function render(template, data, options = {}) {
  const shouldEscape = options.escape !== false;

  const fnBody = [];
  fnBody.push('var __r=[];');

  if (shouldEscape) {
    fnBody.push(
      "function __esc(s){" +
        "var s=String(s)," +
        "m={'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#x27;'};" +
        "return s.replace(/[&<>\"']/g,function(c){return m[c]})" +
      "}"
    );
  }
```

**`__r=[]`**：结果数组，所有输出都 push 到这里，最后 `join('')`。

**`__esc` 转义函数**：注入到生成代码中，对 `&<>"'` 五种字符做 HTML 转义，默认开启。

### 3.3 控制结构解析

```javascript
  const lines = template.split('\n');

  for (let li = 0; li < lines.length; li++) {
    let line = lines[li];

    while (line.length > 0) {
      const eachOpen = line.match(/\{\{#each\s+(\w+)\}\}/);
      const ifOpen = line.match(/\{\{#if\s+(\w+)\}\}/);
      const eachClose = line.indexOf('{{/each}}');
      const ifClose = line.indexOf('{{/if}}');

      const candidates = [];
      if (eachOpen) candidates.push({ type: 'each-open', idx: eachOpen.index, len: eachOpen[0].length, name: eachOpen[1] });
      if (ifOpen) candidates.push({ type: 'if-open', idx: ifOpen.index, len: ifOpen[0].length, name: ifOpen[1] });
      if (eachClose !== -1) candidates.push({ type: 'each-close', idx: eachClose, len: 9 });
      if (ifClose !== -1) candidates.push({ type: 'if-close', idx: ifClose, len: 7 });
```

逐行处理模板，用正则匹配控制标签。一行可能有多个标签，所以用 `while` 循环逐步消费。

```javascript
      if (candidates.length === 0) {
        fnBody.push(pushLine(line, shouldEscape));
        line = '';
        break;
      }

      candidates.sort((a, b) => a.idx - b.idx);
      const first = candidates[0];

      const before = line.substring(0, first.idx);
      if (before) {
        fnBody.push(pushLine(before, shouldEscape));
      }

      switch (first.type) {
        case 'each-open':
          fnBody.push(`var __arr=${first.name};for(var __i=0;__i<__arr.length;__i++){`);
          break;
        case 'if-open':
          fnBody.push(`if(${first.name}){`);
          break;
        case 'each-close':
        case 'if-close':
          fnBody.push('}');
          break;
      }

      line = line.substring(first.idx + first.len);
    }

    if (li < lines.length - 1) {
      fnBody.push("__r.push('\\n');");
    }
  }
```

按位置排序取第一个标签，处理标签前的文本，然后将标签转为对应的 JS 代码。

### 3.4 执行生成的代码

```javascript
  const code = `with(__data){${fnBody.join(';\n')};return __r.join('');}`;
  const fn = new Function('__data', code);
  return fn(data);
}
```

**`with(__data)`**：将数据对象的属性注入作用域链，模板中直接写 `name` 就能访问 `data.name`。

**`new Function`**：创建独立函数，不使用 `eval`（`eval` 会污染当前作用域）。

---

## 第四步：常见追问

### Q1：with 语句有什么缺点？

- 性能问题：引擎无法在编译时确定变量来源，无法优化
- 严格模式下被禁止
- 但在模板引擎场景下恰好是最佳选择——就是要动态建立作用域

### Q2：如何防止 XSS？

默认开启 HTML 转义，对 `&<>"'` 做替换。可通过 `options.escape = false` 关闭（渲染可信 HTML 时）。

### Q3：如何实现编译缓存？

```javascript
const cache = {};
function render(template, data) {
  if (!cache[template]) {
    cache[template] = compile(template);
  }
  return cache[template](data);
}
```

同一模板只编译一次，后续直接调用缓存的函数。

### Q4：与 Vue 模板编译相比缺少了什么？

- 没有 AST 解析（本题用正则直接生成代码）
- 没有虚拟 DOM diff
- 没有表达式求值（如 `{{a + b}}`）
- 没有指令系统（`v-if`、`v-for` 等）

---

## 第五步：易错点

| 易错点 | 说明 |
|-------|------|
| 用 eval 而非 new Function | eval 污染当前作用域，应使用 new Function |
| 不处理变量不存在 | 应输出空字符串而非 "undefined" |
| 不做 XSS 转义 | 用户输入可能包含 `<script>` |
| 用 split('-') 解析预发布标签 | 多 `-` 会丢失，应用 indexOf + slice |
| 循环内不支持 this/@index | 需要特殊映射到 __arr[__i] 和 __i |
| 文本中的单引号不转义 | 生成的代码会语法错误 |
