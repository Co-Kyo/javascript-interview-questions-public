# 07 - 手写 instanceof 详解

---

## 第一步：理解问题

`instanceof` 的本质是一个**原型链查询**操作：

```
left instanceof right  →  right.prototype 是否在 left 的原型链上？
```

以 `[] instanceof Array` 为例：

```
[]  →  Array.prototype  →  Object.prototype  →  null
      ✅ 找到了 Array.prototype，返回 true
```

以 `123 instanceof Number` 为例：

```
123 是基本类型，根本没有原型链可言 → 直接返回 false
```

**关键认知：** `instanceof` 不检查"谁创建了你"，而是检查"你的原型链上有没有这个 prototype"。

---

## 第二步：核心思路——原型链遍历

算法非常直观：

1. 从 `left` 的原型出发（`Object.getPrototypeOf(left)`）
2. 沿原型链逐级上溯
3. 每一步比较当前原型是否 `=== right.prototype`
4. 找到 → `true`，走到链尾（`null`）还没找到 → `false`

```
初始: proto = Object.getPrototypeOf(left)

while (proto !== null) {
    if (proto === right.prototype) return true;
    proto = Object.getPrototypeOf(proto);  // 上溯一级
}
return false;
```

原型链结构示意：

```
new Bar()
    │
    ▼
Bar.prototype
    │  ← Object.getPrototypeOf()
    ▼
Foo.prototype
    │  ← Object.getPrototypeOf()
    ▼
Object.prototype
    │  ← Object.getPrototypeOf()
    ▼
   null  ← 链的终点
```

---

## 第三步：逐步实现

### 3.1 处理基本类型

```js
if (left === null || left === undefined) return false;
if (typeof left !== 'object' && typeof left !== 'function') return false;
```

**为什么？** 原生 `instanceof` 对基本类型一律返回 `false`：

```js
123 instanceof Number    // false（不是 Number 对象，是 number 基本类型）
new Number(123) instanceof Number  // true（这是 Number 对象）
```

基本类型没有 `__proto__`（虽然 JS 会临时包装，但 `instanceof` 不认），直接短路返回。

### 3.2 获取起点与目标

```js
let proto = Object.getPrototypeOf(left);
const prototype = right.prototype;
```

- `proto`：遍历的起点，即 `left` 的直接原型
- `prototype`：目标值，即构造函数的 `prototype` 属性

**推荐用 `Object.getPrototypeOf()` 而非 `.__proto__`**，前者是标准 API，后者是已废弃的访问器属性。

### 3.3 原型链遍历

```js
while (proto !== null) {
    if (proto === prototype) return true;
    proto = Object.getPrototypeOf(proto);
}
return false;
```

核心循环——沿着原型链一跳一跳往上走，直到找到或走到尽头。

---

## 第四步：常见追问

### Q1：为什么不直接用 `.__proto__`？

`.__proto__` 是非标准的访问器属性（虽然现代浏览器都支持），ECMAScript 标准推荐使用 `Object.getPrototypeOf()`。在面试中使用标准 API 体现规范意识。

### Q2：如何处理 `Symbol.hasInstance`？

`Symbol.hasInstance` 是 ES6 引入的，允许自定义 `instanceof` 行为：

```js
class EvenNumber {
  static [Symbol.hasInstance](value) {
    return typeof value === 'number' && value % 2 === 0;
  }
}
4 instanceof EvenNumber  // true
```

进阶实现需要在**基本类型检查之前**先检查 `Symbol.hasInstance`（因为自定义的 `Symbol.hasInstance` 可能对基本类型也返回 true），同时需要排除默认实现：

```js
// 必须放在基本类型检查之前！否则 4 instanceof EvenNumber 会先被短路返回 false
if (right[Symbol.hasInstance] !== Function.prototype[Symbol.hasInstance]) {
  return right[Symbol.hasInstance](left);
}
```

### Q3：cross-realm（跨 iframe）场景？

```js
// 在 iframe 中
const iframeArr = window.frames[0].Array;
[] instanceof iframeArr  // false ❌ 原生也返回 false
```

这是因为不同 realm 的 `Array.prototype` 不是同一个对象引用。`Array.isArray()` 能解决这个问题，因为它内部用的是内部槽位检查而非原型链。手写 `instanceof` 无法解决此问题，但**知道这个坑**是加分项。

### Q4：`Object.getPrototypeOf` 和 `Reflect.getPrototypeOf` 的区别？

两者功能基本一致。`Reflect.getPrototypeOf` 在遇到非对象参数时会抛出 `TypeError`，而 `Object.getPrototypeOf` 会先对参数做 `ToObject` 转换。`instanceof` 的语义更接近 `Object.getPrototypeOf`。

### Q5：为什么基本类型用 `typeof` 判断而不是 `instanceof`？

```js
typeof 123        // 'number'  ✅ 可靠
123 instanceof Number  // false   — 基本类型不是实例
typeof null       // 'object' — 历史 bug，但 null 的特殊处理靠 === 判断
```

`typeof` 是检测基本类型的标准方式，`instanceof` 是检测引用类型继承关系的方式，两者互补。

---

## 第五步：易错点

### ❌ 易错点 1：忘记处理基本类型

```js
// 错误：没有基本类型检查
function myInstanceof(left, right) {
  let proto = Object.getPrototypeOf(left); // 基本类型会报错或行为异常
  // ...
}
```

基本类型调用 `Object.getPrototypeOf()` 会返回对应包装对象的原型，导致误判：

```js
Object.getPrototypeOf(123)  // Number.prototype → 会错误返回 true！
```

**必须在遍历前短路返回 `false`。**

### ❌ 易错点 2：用 `==` 而非 `===` 比较

```js
if (proto == prototype) // ❌ 宽松比较可能导致误判
if (proto === prototype) // ✅ 严格比较原型引用
```

原型链上的比较必须是**引用相等**（`===`），因为每个构造函数的 `prototype` 是唯一的对象引用。

### ❌ 易错点 3：没有处理 `null` 的情况

```js
// Object.getPrototypeOf(null)  → TypeError!
// null 没有原型，必须在循环外提前处理
```

### ❌ 易错点 4：循环终止条件错误

```js
// 错误：用了 while (proto) 而非 while (proto !== null)
while (proto) { ... }
// 如果 proto 是某个 falsy 但非 null 的值就会提前终止
// 实际上原型链末端是 null，用 !== null 更精确
```

### ❌ 易错点 5：把 `right.prototype` 搞反

```js
// 面试紧张时容易写反：
if (proto === left.prototype)  // ❌ 搞反了
if (proto === right.prototype) // ✅ 要找的是 right 的 prototype
```

**口诀：沿着 left 的链走，找 right 的 prototype。**

---

## 完整参考实现

```js
function myInstanceof(left, right) {
  // right 必须是函数
  if (typeof right !== 'function') {
    throw new TypeError('Right-hand side of instanceof is not callable');
  }

  // Symbol.hasInstance 优先（放在基本类型检查之前）
  if (right[Symbol.hasInstance] !== Function.prototype[Symbol.hasInstance]) {
    return right[Symbol.hasInstance](left);
  }

  // 基本类型 → false
  if (left === null || left === undefined) return false;
  if (typeof left !== 'object' && typeof left !== 'function') return false;

  // 原型链遍历
  let proto = Object.getPrototypeOf(left);
  const prototype = right.prototype;

  while (proto !== null) {
    if (proto === prototype) return true;
    proto = Object.getPrototypeOf(proto);
  }

  return false;
}
```

**总结：** 手写 `instanceof` 是一道"会了就很简单，不会就很难"的题。核心就一句话——**沿着 `left` 的原型链走，看能不能碰到 `right.prototype`**。搞定原型链，这题就稳了。
