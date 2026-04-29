> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# 18 - 对象路径取值 get(obj, path)

## 基本信息

| 项目 | 内容 |
|------|------|
| 分类 | 数据结构与算法 |
| 难度 | ⭐⭐ |
| 考察点 | 字符串解析、迭代/循环、安全取值 |

## 背景

在前端开发中，我们经常需要处理深层嵌套的 API 响应数据。如果直接访问 `response.data.user.profile.address.city`，当任意一层为 `null` 或 `undefined` 时，就会抛出 `TypeError`。Lodash 提供了 `_.get(obj, path, defaultValue)` 方法来安全地取值。本题要求你实现一个类似的功能。

## 题目要求

实现 `get(obj, path, defaultValue)` 函数：

- **参数 `obj`**：要取值的对象
- **参数 `path`**：取值路径，支持点号路径（`'a.b.c'`）、数组下标（`'a[0].b'`）、混合路径（`'a.b[0].c.d'`），也支持数组形式（`['a', 'b']`）
- **参数 `defaultValue`**（可选）：路径不存在时返回的默认值

## 示例

```javascript
get({ a: { b: { c: 1 } } }, 'a.b.c')              // → 1
get({ a: [{ b: 1 }] }, 'a[0].b')                    // → 1
get({}, 'a.b', 'default')                            // → 'default'
get({ a: null }, 'a.b.c', 'fallback')                // → 'fallback'
get({ 'a': { 'some.key': 42 } }, "a['some.key']")   // → 42
get({ a: 1 }, '')                                    // → { a: 1 }
get({ a: { b: 3 } }, ['a', 'b'])                     // → 3
get({ a: { b: 0 } }, 'a.b', 'default')               // → 0（0 是有效值）
```

## 约束

1. 路径中任意一层不存在或为 `null`/`undefined` 时，返回 `defaultValue`（默认为 `undefined`）
2. 支持 `path` 为字符串（点号分隔 + 方括号下标）或数组
3. 不要使用 `eval` 或 `new Function`
4. 值为 `0`、`false`、`null` 等 falsy 值时，不应被替换为 `defaultValue`，只有 `undefined` 才替换
