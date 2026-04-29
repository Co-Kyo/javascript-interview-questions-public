/**
 * 18 - 对象路径取值 get(obj, path) — 测试
 * 运行：node test.js
 */

const { get } = require('./solution.js');

// 基础点号路径
console.assert(get({ a: { b: { c: 1 } } }, 'a.b.c') === 1, '基础点号路径');

// 数组下标
console.assert(get({ a: [{ b: 1 }] }, 'a[0].b') === 1, '数组下标');

// 路径不存在，返回默认值
console.assert(get({}, 'a.b', 'default') === 'default', '路径不存在返回默认值');

// 混合路径
console.assert(get({ a: { b: [{ c: { d: 2 } }] } }, 'a.b[0].c.d') === 2, '混合路径');

// 中间层为 null
console.assert(get({ a: null }, 'a.b.c', 'fallback') === 'fallback', '中间层为 null');

// 路径为空字符串 → 返回对象本身
const obj = { a: 1 };
console.assert(get(obj, '') === obj, '空路径返回对象本身');

// path 为数组
console.assert(get({ a: { b: 3 } }, ['a', 'b']) === 3, 'path 为数组');

// 值为 0（不应被当作 falsy 而误返回 default）
console.assert(get({ a: { b: 0 } }, 'a.b', 'default') === 0, '值为 0 不误返回 default');

// 值为 null（null 是有效值，不应替换为 default）
console.assert(get({ a: { b: null } }, 'a.b', 'default') === null, '值为 null 不替换为 default');

// 引号包裹的 key（单引号）
console.assert(get({ 'a': { 'some.key': 42 } }, "a['some.key']") === 42, '单引号包裹的 key');

// 引号包裹的 key（双引号）
console.assert(get({ 'a': { 'some.key': 42 } }, 'a["some.key"]') === 42, '双引号包裹的 key');

// 引号 key 中无点号
console.assert(get({ a: { hello: 'world' } }, "a['hello']") === 'world', '引号 key 中无点号');

// 嵌套数组
console.assert(get({ a: [[1, 2], [3, 4]] }, 'a[1][0]') === 3, '嵌套数组');

console.log('✅ 全部通过');
