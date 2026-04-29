/**
 * 安全地从嵌套对象中按路径取值
 * @param {any} obj - 要取值的对象
 * @param {string|Array} path - 取值路径，支持 'a.b[0].c' 或 ['a','b','0','c']
 * @param {any} [defaultValue] - 路径不存在时返回的默认值
 * @returns {any}
 */
function get(obj, path, defaultValue = undefined) {
  // 1. 将路径统一解析为 key 数组
  const keys = parsePath(path);

  // 2. 逐层取值
  let current = obj;
  for (const key of keys) {
    // 任意一层为 null 或 undefined，安全退出
    if (current == null) {
      return defaultValue;
    }
    current = current[key];
  }

  // 3. 最终值为 undefined 时返回 defaultValue
  return current === undefined ? defaultValue : current;
}

/**
 * 将路径字符串解析为属性名数组
 * 支持：'a.b.c' → ['a','b','c']
 *       'a[0].b' → ['a','0','b']
 *       'a.b[0].c.d' → ['a','b','0','c','d']
 * @param {string|Array} path
 * @returns {string[]}
 */
function parsePath(path) {
  // 如果已经是数组，直接返回
  if (Array.isArray(path)) {
    return path.map(String);
  }

  // 用 match 逐 token 提取，避免 split 在引号内点号处错误分割
  // 匹配三种 token：
  //   1. 方括号内的数字索引：[0], [123]
  //   2. 方括号内的引号字符串 key：['key'], ["key"]
  //   3. 点号分隔的字段名：a, b, name
  const tokens = [];
  const regex = /\[(\d+)\]|\[(['"])(.*?)\2\]|([^.\[\]]+)/g;
  let match;

  while ((match = regex.exec(path)) !== null) {
    if (match[1] !== undefined) {
      // 数字索引：[0]
      tokens.push(match[1]);
    } else if (match[3] !== undefined) {
      // 引号包裹的字符串 key：['key'] 或 ["key"]
      tokens.push(match[3]);
    } else if (match[4] !== undefined) {
      // 点号分隔的字段名
      tokens.push(match[4]);
    }
  }

  return tokens;
}

// ==================== 测试用例 ====================

// 基础点号路径
console.log(get({ a: { b: { c: 1 } } }, 'a.b.c')); // → 1

// 数组下标
console.log(get({ a: [{ b: 1 }] }, 'a[0].b')); // → 1

// 路径不存在，返回默认值
console.log(get({}, 'a.b', 'default')); // → 'default'

// 混合路径
console.log(get({ a: { b: [{ c: { d: 2 } }] } }, 'a.b[0].c.d')); // → 2

// 中间层为 null
console.log(get({ a: null }, 'a.b.c', 'fallback')); // → 'fallback'

// 路径为空字符串 → 返回对象本身
console.log(get({ a: 1 }, '')); // → { a: 1 }

// path 为数组
console.log(get({ a: { b: 3 } }, ['a', 'b'])); // → 3

// 值为 0（不应被当作 falsy 而误返回 default）
console.log(get({ a: { b: 0 } }, 'a.b', 'default')); // → 0

// 值为 null（null 是有效值，不应替换为 default）
console.log(get({ a: { b: null } }, 'a.b', 'default')); // → null

// 引号包裹的 key（单引号）
console.log(get({ 'a': { 'some.key': 42 } }, "a['some.key']")); // → 42

// 引号包裹的 key（双引号）
console.log(get({ 'a': { 'some.key': 42 } }, 'a["some.key"]')); // → 42

// 引号 key 中无点号
console.log(get({ a: { hello: 'world' } }, "a['hello']")); // → 'world'

// 嵌套数组
console.log(get({ a: [[1, 2], [3, 4]] }, 'a[1][0]')); // → 3
