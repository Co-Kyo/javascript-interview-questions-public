/**
 * 19 - 大数相加 — 测试
 * 运行：node test.js
 */

const { add, addWithPad, addRecursive, sanitize } = require('./solution.js');

// --- 双指针法 ---

console.assert(add('999999999999999999', '1') === '1000000000000000000', '双指针法：进位扩展');
console.assert(add('123', '456') === '579', '双指针法：基本加法');
console.assert(add('0', '0') === '0', '双指针法：两个零');
console.assert(add('1', '999') === '1000', '双指针法：短+长');
console.assert(add('999', '1') === '1000', '双指针法：长+短');

// --- 补零对齐法 ---

console.assert(addWithPad('999999999999999999', '1') === '1000000000000000000', '补全法：进位扩展');
console.assert(addWithPad('123', '456') === '579', '补全法：基本加法');

// --- 递归法 ---

console.assert(addRecursive('999999999999999999', '1') === '1000000000000000000', '递归法：进位扩展');
console.assert(addRecursive('123', '456') === '579', '递归法：基本加法');

// --- 边界条件 ---

console.assert(add('', '') === '0', '空字符串处理');
console.assert(add('007', '3') === '10', '前导零处理');
console.assert(add('5', '5') === '10', '单位进位');
console.assert(add('0', '0') === '0', '零+零');

// --- sanitize ---

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
