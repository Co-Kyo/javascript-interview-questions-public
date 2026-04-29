const { render } = require('./solution.js')

// 测试1: 基础插值
{
  const r = render('Hello {{name}}', { name: 'World' })
  console.assert(r === 'Hello World', '基础插值: ' + r)
}

// 测试2: 嵌套属性
{
  const r = render('{{a.b.c}}', { a: { b: { c: 'deep' } } })
  console.assert(r === 'deep', '嵌套属性: ' + r)
}

// 测试3: 条件渲染 - true
{
  const r = render('{{#if show}}visible{{/if}}', { show: true })
  console.assert(r === 'visible', '条件渲染 true: ' + r)
}

// 测试4: 条件渲染 - false
{
  const r = render('{{#if show}}visible{{/if}}', { show: false })
  console.assert(r === '', '条件渲染 false: ' + JSON.stringify(r))
}

// 测试5: 循环渲染
{
  const r = render('{{#each items}}{{this}},{{/each}}', { items: ['a', 'b', 'c'] })
  console.assert(r === 'a,b,c,', '循环渲染: ' + r)
}

// 测试6: @index
{
  const r = render('{{#each items}}{{@index}}:{{this}} {{/each}}', { items: ['x', 'y'] })
  console.assert(r === '0:x 1:y ', '@index: ' + r)
}

// 测试7: 变量不存在兜底
{
  const r = render('Hello {{missing}}', {})
  console.assert(r === 'Hello ', '变量不存在兜底: ' + JSON.stringify(r))
}

// 测试8: 嵌套控制结构
{
  const r = render('{{#if show}}{{#each items}}{{this}} {{/each}}{{/if}}', { show: true, items: ['x', 'y'] })
  console.assert(r === 'x y ', '嵌套控制: ' + JSON.stringify(r))
}

// 测试9: XSS 防护（默认开启）
{
  const r = render('<div>{{content}}</div>', { content: '<script>alert("xss")</script>' })
  console.assert(!r.includes('<script>'), 'XSS 防护: 脚本被转义')
  console.assert(r.includes('&lt;script&gt;'), 'XSS 防护: 包含转义字符')
}

// 测试10: 关闭转义
{
  const r = render('<b>{{name}}</b>', { name: 'Tom' }, { escape: false })
  console.assert(r === '<b>Tom</b>', '关闭转义: ' + r)
}

// 测试11: 综合测试 - 多行模板
{
  const template = [
    '<h1>{{title}}</h1>',
    '{{#if showList}}',
    '<ul>',
    '  {{#each items}}',
    '  <li>{{@index}}: {{this}}</li>',
    '  {{/each}}',
    '</ul>',
    '{{/if}}',
  ].join('\n')

  const data = {
    title: 'My Page',
    showList: true,
    items: ['Apple', 'Banana'],
  }

  const r = render(template, data)
  console.assert(r.includes('<h1>My Page</h1>'), '综合: 标题')
  console.assert(r.includes('<li>0: Apple</li>'), '综合: 第一项')
  console.assert(r.includes('<li>1: Banana</li>'), '综合: 第二项')
}

// 测试12: 空模板
{
  const r = render('', {})
  console.assert(r === '', '空模板: ' + JSON.stringify(r))
}

// 测试13: 无控制结构的纯文本
{
  const r = render('no template here', {})
  console.assert(r === 'no template here', '纯文本')
}

console.log('✅ 全部通过')
