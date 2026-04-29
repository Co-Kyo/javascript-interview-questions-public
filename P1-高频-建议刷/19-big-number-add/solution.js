/**
 * 19 - 大数相加
 * 考察点：字符串运算、进位处理、数学思维
 */

/**
 * 输入校验：处理空字符串和前导零
 * @param {string} str - 输入字符串
 * @returns {string} - 清洗后的字符串（空字符串返回 '0'，去除前导零）
 */
function sanitize(str) {
  if (typeof str !== 'string') throw new TypeError('参数必须为字符串');
  if (str.length === 0) return '0';
  // 去除前导零，但保留至少一位
  const trimmed = str.replace(/^0+/, '');
  return trimmed.length === 0 ? '0' : trimmed;
}

/**
 * 标准双指针法：从尾部逐位相加 + 进位
 * @param {string} a - 大整数字符串
 * @param {string} b - 大整数字符串
 * @returns {string} - 相加结果字符串
 */
function add(a, b) {
  a = sanitize(a);
  b = sanitize(b);

  let i = a.length - 1;
  let j = b.length - 1;
  let carry = 0;
  const result = [];

  // 从最低位开始逐位相加
  while (i >= 0 || j >= 0 || carry > 0) {
    const digitA = i >= 0 ? parseInt(a[i], 10) : 0;
    const digitB = j >= 0 ? parseInt(b[j], 10) : 0;
    const sum = digitA + digitB + carry;

    result.push(sum % 10);  // 当前位
    carry = Math.floor(sum / 10);  // 进位

    i--;
    j--;
  }

  return result.reverse().join('');
}

/**
 * 前导零补全法：先补零对齐，再逐位计算
 * 代码更清晰，适合面试讲解
 */
function addWithPad(a, b) {
  a = sanitize(a);
  b = sanitize(b);

  // 补零对齐到相同长度
  const maxLen = Math.max(a.length, b.length);
  const aPadded = a.padStart(maxLen, '0');
  const bPadded = b.padStart(maxLen, '0');

  let carry = 0;
  const result = [];

  for (let i = maxLen - 1; i >= 0; i--) {
    const sum = parseInt(aPadded[i], 10) + parseInt(bPadded[i], 10) + carry;
    result.push(sum % 10);
    carry = Math.floor(sum / 10);
  }

  if (carry) result.push(carry);

  return result.reverse().join('');
}

/**
 * 递归写法：纯函数式风格，无循环
 * ⚠️ 注意：超长输入（>数千位）会导致栈溢出，仅适合面试演示，不适合生产使用
 */
function addRecursive(a, b, carry = 0, i, j) {
  // 首次调用时进行输入校验
  if (i === undefined) {
    a = sanitize(a);
    b = sanitize(b);
    i = a.length - 1;
    j = b.length - 1;
  }
  if (i < 0 && j < 0 && carry === 0) return '';

  const digitA = i >= 0 ? parseInt(a[i], 10) : 0;
  const digitB = j >= 0 ? parseInt(b[j], 10) : 0;
  const sum = digitA + digitB + carry;

  return addRecursive(a, b, Math.floor(sum / 10), i - 1, j - 1) + (sum % 10);
}

// ============ 测试用例 ============

console.log('--- 测试双指针法 ---');
console.log(add('999999999999999999', '1'));
// → '1000000000000000000'

console.log(add('123', '456'));
// → '579'

console.log(add('0', '0'));
// → '0'

console.log(add('1', '999'));
// → '1000'

console.log(add('999', '1'));
// → '1000'

console.log('--- 测试补全法 ---');
console.log(addWithPad('999999999999999999', '1'));
// → '1000000000000000000'

console.log(addWithPad('123', '456'));
// → '579'

console.log('--- 测试递归法 ---');
console.log(addRecursive('999999999999999999', '1'));
// → '1000000000000000000'

console.log(addRecursive('123', '456'));
// → '579'

console.log('--- 测试边界条件 ---');
console.log(add('', ''));
// → '0' (空字符串处理)

console.log(add('007', '3'));
// → '10' (前导零处理)

console.log(add('0', '0'));
// → '0'

console.log(add('5', '5'));
// → '10'
