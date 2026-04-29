# 大数相加 - 讲解

## 第一步：理解问题

JavaScript 的 `Number` 类型采用 IEEE 754 双精度浮点数，安全整数范围是 `-(2^53 - 1)` 到 `2^53 - 1`（即 `Number.MAX_SAFE_INTEGER = 9007199254740991`，16 位）。

当数字超过这个精度时，运算会丢失精度：

```js
9007199254740992 + 1  // → 9007199254740992（丢失精度！）
```

**面试官想考察什么**：不依赖 BigInt，用纯字符串模拟小学竖式加法——考察基本功、边界处理和编码细致度。

## 第二步：核心思路——竖式类比

想象小学做竖式加法：

```
  9 9 9
+     1
-------
1 0 0 0
```

关键点：
1. **从最低位（最右边）开始逐位相加**
2. **每一位的和 = 两数对应位 + 上一位的进位**
3. **当前位 = 和 % 10，进位 = 和 / 10 取整**
4. **位数不同时，短的数前面补 0**

## 第三步：逐步实现

### 方案一：双指针法（推荐 ✅）

```js
function sanitize(str) {
  if (typeof str !== 'string') throw new TypeError('参数必须为字符串');
  if (str.length === 0) return '0';
  const trimmed = str.replace(/^0+/, '');
  return trimmed.length === 0 ? '0' : trimmed;
}

function add(a, b) {
  a = sanitize(a);  // 输入校验
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

    i--; j--;
  }

  return result.reverse().join('');
}
```

**为什么循环条件是 `i >= 0 || j >= 0 || carry > 0`？**
- `i >= 0 || j >= 0`：处理两个数长度不同的情况
- `carry > 0`：处理最高位还有进位的情况（如 999 + 1 = 1000）

**为什么需要 `sanitize`？**
- 空字符串 `''` 经过处理后返回 `'0'`，避免 `parseInt('', 10)` 返回 `NaN`
- 前导零如 `'007'` 经过处理后变为 `'7'`，避免结果出现 `'010'` 这样的前导零

### 方案二：补零对齐法

```js
function addWithPad(a, b) {
  const maxLen = Math.max(a.length, b.length);
  const aPadded = a.padStart(maxLen, '0');  // 补零对齐
  const bPadded = b.padStart(maxLen, '0');

  let carry = 0;
  const result = [];

  for (let i = maxLen - 1; i >= 0; i--) {
    const sum = parseInt(aPadded[i], 10) + parseInt(bPadded[i], 10) + carry;
    result.push(sum % 10);
    carry = Math.floor(sum / 10);
  }

  if (carry) result.push(carry);  // 最后进位
  return result.reverse().join('');
}
```

## 第四步：常见变体与追问

**1. 支持负数？**
- 判断符号，正+负变成减法，负+负取绝对值相加后加负号

**2. 支持小数？**
- 找到两个数的小数点位置，对齐小数部分，分别处理整数和小数

**3. 大数相乘？**
- 每一位相乘后累加到对应位置，最后统一进位（模拟竖式乘法）

**4. 为什么不用 BigInt？**
- 面试考察的是算法思维，BigInt 是语言特性
- 实际项目中 BigInt 是更好的选择

## 第五步：复杂度分析

| 方法 | 时间复杂度 | 空间复杂度 | 适用场景 |
|------|-----------|-----------|---------|
| 双指针法 | O(max(m, n)) | O(max(m, n)) | ✅ 推荐，面试首选 |
| 补零对齐法 | O(max(m, n)) | O(max(m, n)) | 代码更直观 |
| 递归法 | O(max(m, n)) | O(max(m, n)) 栈空间 | ⚠️ 仅演示，超长输入会栈溢出 |

其中 m、n 分别为两个输入字符串的长度。

## 第六步：易错点总结

| 易错点 | 说明 | 解决方案 |
|--------|------|---------|
| 循环终止条件遗漏 carry | 如 `add('999', '1')` 结果变成 `000` 而不是 `1000` | 循环条件加 `carry > 0` |
| 空字符串输入 | `parseInt('', 10)` 返回 `NaN`，导致结果异常 | `sanitize()` 将空字符串转为 `'0'` |
| 前导零输入 | `'007' + '3'` 可能输出 `'010'` | `sanitize()` 去除前导零 |
| 未反转结果数组 | 结果是逆序存储的，最后必须 reverse | 记得 `.reverse().join('')` |
| parseInt 第二个参数 | 必须传 10 进制，避免 `'08'` 被解析为八进制 | `parseInt(x, 10)` |
| 递归栈溢出 | 超长输入（>数千位）递归会爆栈 | 用迭代法替代，递归仅作演示 |
