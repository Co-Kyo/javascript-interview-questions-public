/**
 * 简易模板引擎 - render 函数实现
 *
 * 支持功能：
 *   1. {{variable}} 变量插值（含嵌套属性 {{a.b.c}}）
 *   2. {{#if variable}}...{{/if}} 条件渲染
 *   3. {{#each list}}...{{/each}} 循环渲染（支持 {{this}} 和 {{@index}}）
 *   4. 嵌套控制结构（如 {{#if}} 内嵌 {{#each}}）
 *   5. XSS 防护（默认开启，可通过 options.escape 关闭）
 *
 * 核心思路：正则解析模板 → 生成可执行的函数体 → 通过 Function 构造器执行
 *
 * 已知限制：
 *   - 不支持嵌套同类型循环（{{#each}} 内嵌 {{#each}}）因 __arr/__i 变量名冲突
 *   - 不支持表达式求值（如 {{a + b}}），仅支持属性访问
 *   - 变量不存在时输出空字符串而非 "undefined"
 */

/**
 * 辅助函数：将一行文本中的 {{expr}} 替换为值拼接代码
 * 返回代码字符串，例如：__r.push('Hello ');__r.push(name);
 *
 * @param {string} line - 模板行文本
 * @param {boolean} escape - 是否对变量值做 HTML 转义
 */
function pushLine(line, escape) {
  // split 配合捕获组，偶数位=文本，奇数位=表达式
  const parts = line.split(/\{\{(.*?)\}\}/);
  const codes = [];

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      // 普通文本（不转义，因为是模板硬编码内容）
      const text = parts[i];
      if (text) {
        codes.push(`__r.push('${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')`);
      }
    } else {
      // 表达式
      const expr = parts[i].trim();
      let valCode;

      if (expr === 'this') {
        valCode = '__arr[__i]';
      } else if (expr === '@index') {
        valCode = '__i';
      } else if (expr.startsWith('@')) {
        // 未知 @ 变量，输出空
        codes.push("__r.push('')");
        continue;
      } else {
        // 普通变量：用 typeof 检查，不存在时兜底空字符串
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

/**
 * 编译并渲染模板
 *
 * @param {string} template - 模板字符串
 * @param {object} data - 数据对象
 * @param {object} [options] - 选项
 * @param {boolean} [options.escape=true] - 是否开启 XSS 转义
 * @returns {string} 渲染结果
 */
function render(template, data, options = {}) {
  const shouldEscape = options.escape !== false; // 默认开启 XSS 防护

  // ========== Step 1: 逐行生成函数体代码 ==========
  const fnBody = [];
  fnBody.push('var __r=[];');

  // 注入 HTML 转义函数（自包含，不依赖外部变量）
  if (shouldEscape) {
    fnBody.push(
      "function __esc(s){" +
        "var s=String(s)," +
        "m={'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#x27;'};" +
        "return s.replace(/[&<>\"']/g,function(c){return m[c]})" +
      "}"
    );
  }

  // 按行处理，简化控制流解析
  const lines = template.split('\n');

  for (let li = 0; li < lines.length; li++) {
    let line = lines[li];

    // 先处理控制结构标签，可能一行有多个
    // 用循环逐步消费行中的标签
    while (line.length > 0) {
      // 匹配 {{#each list}}
      const eachOpen = line.match(/\{\{#each\s+(\w+)\}\}/);
      // 匹配 {{#if var}}
      const ifOpen = line.match(/\{\{#if\s+(\w+)\}\}/);
      // 匹配 {{/each}}
      const eachClose = line.indexOf('{{/each}}');
      // 匹配 {{/if}}
      const ifClose = line.indexOf('{{/if}}');

      // 找到第一个出现的标签
      const candidates = [];

      if (eachOpen) candidates.push({ type: 'each-open', idx: eachOpen.index, len: eachOpen[0].length, name: eachOpen[1] });
      if (ifOpen) candidates.push({ type: 'if-open', idx: ifOpen.index, len: ifOpen[0].length, name: ifOpen[1] });
      if (eachClose !== -1) candidates.push({ type: 'each-close', idx: eachClose, len: 9 });
      if (ifClose !== -1) candidates.push({ type: 'if-close', idx: ifClose, len: 7 });

      if (candidates.length === 0) {
        // 没有标签了，剩余部分作为纯文本处理
        fnBody.push(pushLine(line, shouldEscape));
        line = '';
        break;
      }

      // 按位置排序，取第一个
      candidates.sort((a, b) => a.idx - b.idx);
      const first = candidates[0];

      // 标签前的文本
      const before = line.substring(0, first.idx);
      if (before) {
        fnBody.push(pushLine(before, shouldEscape));
      }

      // 处理标签
      switch (first.type) {
        case 'each-open':
          fnBody.push(`var __arr=${first.name};for(var __i=0;__i<__arr.length;__i++){`);
          break;
        case 'if-open':
          fnBody.push(`if(${first.name}){`);
          break;
        case 'each-close':
          fnBody.push('}');
          break;
        case 'if-close':
          fnBody.push('}');
          break;
      }

      // 消费标签后的剩余部分
      line = line.substring(first.idx + first.len);
    }

    // 每行末尾加换行（除了最后一行）
    if (li < lines.length - 1) {
      fnBody.push("__r.push('\\n');");
    }
  }

  // ========== Step 2: 用 with 包裹数据作用域，生成完整函数 ==========
  const code = `with(__data){${fnBody.join(';\n')};return __r.join('');}`;

  // ========== Step 3: 通过 Function 构造器创建并执行 ==========
  // new Function 创建独立作用域，不使用 eval
  const fn = new Function('__data', code);
  return fn(data);
}

// ============================================================
// 测试用例
// ============================================================

// 1. 基础插值
console.log('=== 基础插值 ===');
console.log(render('Hello {{name}}', { name: 'World' }));
// → 'Hello World'

// 2. 嵌套属性
console.log('=== 嵌套属性 ===');
console.log(render('{{a.b.c}}', { a: { b: { c: 'deep' } } }));
// → 'deep'

// 3. 条件渲染
console.log('=== 条件渲染 ===');
console.log(render('{{#if show}}visible{{/if}}', { show: true }));
// → 'visible'
console.log(render('{{#if show}}visible{{/if}}', { show: false }));
// → ''

// 4. 循环渲染
console.log('=== 循环渲染 ===');
console.log(render('{{#each items}}{{this}},{{/each}}', { items: ['a', 'b', 'c'] }));
// → 'a,b,c,'

// 5. 综合测试
console.log('=== 综合测试 ===');
const template = [
  '<h1>{{title}}</h1>',
  '{{#if showList}}',
  '<ul>',
  '  {{#each items}}',
  '  <li>{{@index}}: {{this}}</li>',
  '  {{/each}}',
  '</ul>',
  '{{/if}}',
].join('\n');

const data = {
  title: 'My Page',
  showList: true,
  items: ['Apple', 'Banana', 'Cherry'],
};

console.log(render(template, data));

// 6. XSS 防护测试
console.log('=== XSS 防护 ===');
console.log(render('<div>{{content}}</div>', { content: '<script>alert("xss")</script>' }));
// → '<div>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</div>'

// 7. 变量不存在
console.log('=== 变量不存在 ===');
console.log(render('Hello {{missing}}', {}));
// → 'Hello '

// 8. 嵌套控制结构
console.log('=== 嵌套控制结构 ===');
console.log(render('{{#if show}}{{#each items}}{{this}} {{/each}}{{/if}}', { show: true, items: ['x', 'y'] }));
// → 'x y '

// 9. 关闭 XSS 转义
console.log('=== 关闭转义 ===');
console.log(render('<b>{{name}}</b>', { name: 'Tom' }, { escape: false }));
// → '<b>Tom</b>'
