> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# 18 - 对象路径取值 get(obj, path)

## 基本信息

| 项目 | 内容 |
|------|------|
| 分类 | 数据结构与算法 |
| 难度 | ⭐⭐ |
| 考察点 | 字符串解析、迭代/循环、安全取值 |

## 背景

在前端开发中，我们经常需要处理深层嵌套的 API 响应数据。例如：

```json
{
  "data": {
    "user": {
      "profile": {
        "name": "张三",
        "address": {
          "city": "北京"
        }
      }
    }
  }
}
```

如果我们直接访问 `response.data.user.profile.address.city`，当任意一层为 `null` 或 `undefined` 时，就会抛出 `TypeError`。

Lodash 提供了 `_.get(obj, path, defaultValue)` 方法来安全地取值。本题要求你实现一个类似的功能。

## 题目要求

实现 `get(obj, path, defaultValue)` 函数：

- **参数 `obj`**：要取值的对象
- **参数 `path`**：取值路径，支持以下格式：
  - 点号路径：`'a.b.c'`
  - 数组下标：`'a[0].b'`
  - 混合路径：`'a.b[0].c.d'`
- **参数 `defaultValue`**（可选）：路径不存在时返回的默认值

## 示例

```js
// 基础点号路径
get({ a: { b: { c: 1 } } }, 'a.b.c')
// → 1

// 数组下标
get({ a: [{ b: 1 }] }, 'a[0].b')
// → 1

// 路径不存在，返回默认值
get({}, 'a.b', 'default')
// → 'default'

// 混合路径
get({ a: { b: [{ c: { d: 2 } }] } }, 'a.b[0].c.d')
// → 2

// 中间层为 null
get({ a: null }, 'a.b.c', 'fallback')
// → 'fallback'

// 引号包裹的 key
get({ 'some.key': 42 }, "['some.key']")
// → 42

// 路径为空字符串
get({ a: 1 }, '')
// → { a: 1 }

// path 为数组形式
get({ a: { b: 3 } }, ['a', 'b'])
// → 3
```

## 约束

1. 路径中任意一层不存在或为 `null`/`undefined` 时，返回 `defaultValue`（默认为 `undefined`）
2. 支持 `path` 为字符串（点号分隔 + 方括号下标）或数组
3. 不要使用 `eval` 或 `new Function`
4. 考虑边界情况：空路径、数字类型的属性名、嵌套数组
