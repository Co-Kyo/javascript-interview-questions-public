const { add, sanitize } = require('./solution.js');

console.assert(add('999999999999999999', '1') === '1000000000000000000', '进位扩展');
console.assert(add('123', '456') === '579', '基本加法');
console.assert(add('0', '0') === '0', '两个零');
console.assert(add('1', '999') === '1000', '短+长');
console.assert(add('999', '1') === '1000', '长+短');

console.assert(add('', '') === '0', '空字符串处理');
console.assert(add('007', '3') === '10', '前导零处理');
console.assert(add('5', '5') === '10', '单位进位');

console.assert(sanitize('') === '0', 'sanitize 空字符串');
console.assert(sanitize('000') === '0', 'sanitize 全零');
console.assert(sanitize('007') === '7', 'sanitize 前导零');

try {
  sanitize(123);
  console.assert(false, 'sanitize 非字符串应抛 TypeError');
} catch (e) {
  console.assert(e instanceof TypeError, 'sanitize 非字符串抛 TypeError');
}

console.log('✅ 全部通过');
