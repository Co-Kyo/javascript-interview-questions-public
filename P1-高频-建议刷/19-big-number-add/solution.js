function sanitize(str) {
  if (typeof str !== 'string') throw new TypeError('参数必须为字符串');
  if (str.length === 0) return '0';
  const trimmed = str.replace(/^0+/, '');
  return trimmed.length === 0 ? '0' : trimmed;
}


function add(a, b) {
  a = sanitize(a);
  b = sanitize(b);

  let i = a.length - 1;
  let j = b.length - 1;
  let carry = 0;
  const result = [];

  while (i >= 0 || j >= 0 || carry > 0) {
    const digitA = i >= 0 ? parseInt(a[i], 10) : 0;
    const digitB = j >= 0 ? parseInt(b[j], 10) : 0;
    const sum = digitA + digitB + carry;

    result.push(sum % 10);
    carry = Math.floor(sum / 10);

    i--;
    j--;
  }

  return result.reverse().join('');
}


function addWithPad(a, b) {
  a = sanitize(a);
  b = sanitize(b);

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


function addRecursive(a, b, carry = 0, i, j) {
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

module.exports = { add, addWithPad, addRecursive, sanitize };
