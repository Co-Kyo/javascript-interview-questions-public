> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# 07 - 手写 instanceof

## 题目信息

| 属性 | 值 |
|------|-----|
| 分类 | JavaScript 核心手写 |
| 难度 | ⭐⭐ |
| 考察点 | 原型链遍历、边界处理、标准 API 使用 |

---

## 背景

`instanceof` 运算符用于检测构造函数的 `prototype` 属性是否出现在某个实例对象的原型链上。理解原型链是 JavaScript 面试的基础，而手写 `instanceof` 是原型链知识的经典应用——它要求你真正理解对象、构造函数、`prototype`、`__proto__` 三者之间的关系。

---

## 题目要求

实现一个函数 `myInstanceof(left, right)`，功能与原生 `instanceof` 运算符完全一致。

**函数签名：**
```js
function myInstanceof(left, right) {
  // 你的实现
}
```

**参数说明：**
- `left`：待检测的实例对象（左侧操作数）
- `right`：构造函数（右侧操作数）

**返回值：** `boolean`——如果 `left` 是 `right` 的实例则返回 `true`，否则返回 `false`。

---

## 示例

```js
myInstanceof([], Array)          // true
myInstanceof({}, Object)         // true
myInstanceof(new Date(), Date)   // true
myInstanceof(/abc/, RegExp)      // true

myInstanceof(123, Number)        // false — 基本类型不是任何构造函数的实例
myInstanceof('hello', String)    // false
myInstanceof(true, Boolean)      // false
myInstanceof(null, Object)       // false — null 特殊处理
myInstanceof(undefined, Object)  // false — undefined 特殊处理

function Foo() {}
function Bar() {}
Bar.prototype = Object.create(Foo.prototype)
myInstanceof(new Bar(), Foo)     // true — 原型链继承
```

---

## 约束与边界

1. **不使用** `instanceof` 运算符
2. **基本类型**（number、string、boolean、symbol、bigint）直接返回 `false`，即使对应包装对象存在
3. **null 和 undefined** 直接返回 `false`
4. `right` 必须是函数类型，否则应抛出 `TypeError`
5. 需正确处理**原型链继承**场景（多层继承）
6. 考虑 `Symbol.hasInstance` 的情况（进阶加分项）

---

## 评分标准

| 等级 | 标准 |
|------|------|
| ✅ 通过 | 正确遍历原型链，处理基本类型和 null/undefined |
| 🌟 良好 | 额外处理 `Symbol.hasInstance` |
| 💯 优秀 | 处理 `cross-realm` 场景（如 iframe 中的 Array），代码健壮性好 |
