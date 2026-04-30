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

module.exports = { add, sanitize };
