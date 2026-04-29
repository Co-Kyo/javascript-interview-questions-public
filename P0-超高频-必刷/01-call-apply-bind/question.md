> 🔴 **优先级：P0（超高频）** — 字节、腾讯、百度必考题

# 01 手写 call / apply / bind

> 分类：JavaScript 核心手写 | 难度：⭐⭐ | 考察点：this 绑定、原型链、函数上下文

## 背景

在日常开发中，`call`、`apply`、`bind` 是高频使用的函数方法——从手动绑定回调的 `this`，到实现柯里化、借用数组方法，几乎无处不在。面试官通过这道题，想考察候选人是否真正理解 JavaScript 的 `this` 绑定机制，而非停留在"会用"层面。

3-5 年经验的开发者应当能够：
- 从源码层面解释这三个方法的工作原理
- 理解隐式绑定丢失、显式绑定优先级等核心概念
- 处理 `new` 调用时 `this` 的特殊行为
- 考虑 Symbol 键、属性污染等边界情况

这些是写出健壮、可维护代码的基础，也是理解 React 类组件绑定、事件处理等场景的前提。

## 题目要求

实现以下三个方法，功能与原生 `Function.prototype` 上的方法一致：

1. **`Function.prototype.myCall(thisArg, ...args)`** — 以指定 `this` 和参数列表调用函数
2. **`Function.prototype.myApply(thisArg, argsArray)`** — 以指定 `this` 和参数数组调用函数
3. **`Function.prototype.myBind(thisArg, ...args)`** — 返回一个 `this` 被永久绑定的新函数

## 输入输出示例

### 示例 1：基本 this 绑定与参数传递

```javascript
function greet(greeting, punctuation) {
  return `${greeting}, ${this.name}${punctuation}`;
}

const person = { name: 'Alice' };

console.log(greet.myCall(person, 'Hello', '!'));   // "Hello, Alice!"
console.log(greet.myApply(person, ['Hi', '~']));   // "Hi, Alice~"

const boundGreet = greet.myBind(person, 'Hey');
console.log(boundGreet('?'));                        // "Hey, Alice?"
```

### 示例 2：new 调用 bind 返回的函数

```javascript
function Person(name, age) {
  this.name = name;
  this.age = age;
}

const BoundPerson = Person.myBind(null, 'Bob');
const p = new BoundPerson(25);

console.log(p.name);           // "Bob"
console.log(p.age);            // 25
console.log(p instanceof Person); // true（原型链正确）
```

### 示例 3：thisArg 为 null/undefined 时回退到全局对象

```javascript
function getThis() {
  return this;
}

console.log(getThis.myCall(null) === globalThis);  // true（非严格模式）
console.log(getThis.myApply(undefined) === globalThis); // true
```

## 约束与提示

- **不得使用** `Function.prototype.call`、`Function.prototype.apply`、`Function.prototype.bind`
- `myBind` 返回的函数必须支持 `new` 调用，且 `new` 时绑定的 `this` 应被忽略（优先级规则）
- `myBind` 返回的函数通过 `new` 创建的实例，其 `instanceof` 应指向原构造函数
- `myBind` 返回的函数 `name` 属性应为 `"bound " + 原函数名`
- `myApply` 的第二个参数必须是数组，传入非数组应抛出 `TypeError`
- 使用 `Symbol` 作为临时属性键，避免污染目标对象
- `thisArg` 为 `null` 或 `undefined` 时，在非严格模式下应回退到 `globalThis`
- **注意**：严格模式下原生 `call(null)` 传入 `null` 而非全局对象，手写实现可选择性支持
