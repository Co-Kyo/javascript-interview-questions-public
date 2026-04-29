# 解题讲解：对象路径取值 get(obj, path)

## 第一步：理解问题本质

`get` 函数的核心是**按路径逐层访问嵌套属性**，但要保证安全——任意一层不存在时不抛错，而是返回默认值。

这是前端最常见的防御性编程场景：API 返回的数据结构不确定，不能直接写 `res.data.user.name` 这种链式访问。

## 第二步：路径解析——把字符串变成 key 数组

路径有两种写法，需要统一处理：

| 路径字符串 | 解析结果 |
|-----------|---------|
| `'a.b.c'` | `['a', 'b', 'c']` |
| `'a[0].b'` | `['a', '0', 'b']` |
| `'a.b[0].c.d'` | `['a', 'b', '0', 'c', 'd']` |
| `"a['some.key']"` | `['a', 'some.key']` |

**核心正则**：`/\[(\d+)\]|\[(['"])(.*?)\2\]|([^.\[\]]+)/g`

- `\[` 匹配方括号内的数字索引：`[0]`, `[123]`
- `\[` 匹配方括号内的引号字符串 key：`['key']`, `["key"]`（引号被自动剥离）
- `[^.\[\]]+` 匹配点号分隔的字段名

**为什么用 `match` 而不是 `split`？**

`split(/./)` 会在**所有**点号处切割，包括引号内的点号。例如 `a['some.key'].b` 会被错误切成 `["a", "'some", "key'", "b"]`。`match` 方式逐 token 提取，天然不会被引号内的分隔符干扰。

同时支持 `path` 直接传数组的情况（Lodash 也支持），此时跳过解析直接使用。

## 第三步：逐步实现

### 3.1 parsePath — 路径解析函数

```javascript
function parsePath(path) {
  if (Array.isArray(path)) {
    return path.map(String);
  }

  const tokens = [];
  const regex = /\[(\d+)\]|\[(['"])(.*?)\2\]|([^.\[\]]+)/g;
  let match;

  while ((match = regex.exec(path)) !== null) {
    if (match[1] !== undefined) {
      tokens.push(match[1]);
    } else if (match[3] !== undefined) {
      tokens.push(match[3]);
    } else if (match[4] !== undefined) {
      tokens.push(match[4]);
    }
  }

  return tokens;
}
```

**`Array.isArray(path)` 检查**：如果 path 已经是数组，跳过正则解析，直接将每个元素转为字符串返回。

**正则的三个分支**：`match[1]` 对应数字索引 `[0]`；`match[3]` 对应引号包裹的字符串 key `['key']`，引号被正则的捕获组自动剥离；`match[4]` 对应点号分隔的普通字段名。

**`regex.exec` 循环**：正则带 `g` 标志时，`exec` 会从上次匹配位置继续，逐个提取所有 token，直到返回 `null`。

### 3.2 get — 主函数

```javascript
function get(obj, path, defaultValue = undefined) {
  const keys = parsePath(path);

  let current = obj;
  for (const key of keys) {
    if (current == null) {
      return defaultValue;
    }
    current = current[key];
  }

  return current === undefined ? defaultValue : current;
}
```

**`current == null`**：用宽松相等同时捕获 `null` 和 `undefined`。因为 `null` 也没有属性，访问 `null.xxx` 同样会报错。

**`current === undefined`**：最终判断用严格相等，只有 `undefined` 才用 `defaultValue` 替换。`0`、`false`、`null` 都是有效值，不应被替换。

## 第四步：常见追问

**追问 1：如何实现对应的 `set(obj, path, value)`？**

思路类似，逐层遍历路径，到达倒数第二层时创建缺失的中间对象，最后一层赋值。

**追问 2：如果路径中包含转义的点号怎么处理？**

例如 `'a\.b'` 表示 key 本身就是 `a.b`。需要在正则中增加转义支持，遇到 `\.` 时不作为分隔符。

**追问 3：与 Optional Chaining `?.` 相比，`get` 的优势在哪？**

- 动态路径：`get(obj, dynamicPath)` 路径可以是变量
- 默认值：内置 defaultValue 机制
- 数组形式路径：`get(obj, ['a', 'b'])` 支持动态拼接路径

## 第五步：易错点

| 易错点 | 说明 |
|-------|------|
| 用 `split('.')` 解析路径 | 引号内的点号会被错误分割，如 `a['some.key']` |
| 用 `!current` 判断中间层 | `0`、`false`、`''` 都是 falsy 但可能是有效值，应用 `current == null` |
| 最终判断用 `!current` 而非 `=== undefined` | `get({a: 0}, 'a', 'default')` 会错误返回 `'default'` |
| 忘记处理 path 为数组的情况 | Lodash 的 `get` 支持数组 path，面试中主动提及是加分项 |
| 忘记处理空路径 `''` | `parsePath('')` 返回空数组，循环不执行，直接返回 obj 本身 |
