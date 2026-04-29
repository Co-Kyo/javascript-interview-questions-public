> 🔴 **优先级：P0（超高频）** — 字节、腾讯、百度必考题

# 01 手写 call / apply / bind

> 分类：JavaScript 核心手写 | 难度：⭐⭐ | 考察点：this 绑定、原型链、函数上下文

## 背景

`call`、`apply`、`bind` 是高频使用的函数方法——从手动绑定回调的 `this`，到实现柯里化、借用数组方法，几乎无处不在。面试官通过这道题考察你是否真正理解 JavaScript 的 `this` 绑定机制，而非停留在"会用"层面。

## 题目要求

实现以下三个方法，功能与原生 `Function.prototype` 上的方法一致：

1. **`Function.prototype.myCall(thisArg, ...args)`** — 以指定 `this` 和参数列表调用函数
2. **`Function.prototype.myApply(thisArg, argsArray)`** — 以指定 `this` 和参数数组调用函数
3. **`Function.prototype.myBind(thisArg, ...args)`** — 返回一个 `this` 被永久绑定的新函数

## 输入输出示例

```javascript
// 基本 this 绑定
function greet(greeting, punctuation) {
  return `${greeting}, ${this.name}${punctuation}`;
}
const person = { name: 'Alice' };

greet.myCall(person, 'Hello', '!');    // "Hello, Alice!"
greet.myApply(person, ['Hi', '~']);    // "Hi, Alice~"

const boundGreet = greet.myBind(person, 'Hey');
boundGreet('?');                        // "Hey, Alice?"
```

```javascript
// new 调用 bind 返回的函数
function Person(name, age) {
  this.name = name;
  this.age = age;
}
const BoundPerson = Person.myBind(null, 'Bob');
const p = new BoundPerson(25);

p.name;                  // "Bob"
p.age;                   // 25
p instanceof Person;     // true（原型链正确）
```

## 约束与提示

- 不得使用原生 `call`、`apply`、`bind`
- `myBind` 返回的函数必须支持 `new` 调用，且 `new` 时绑定的 `this` 应被忽略
- `myBind` 返回的函数通过 `new` 创建的实例，`instanceof` 应指向原构造函数
- 使用 `Symbol` 作为临时属性键，避免污染目标对象
- `thisArg` 为 `null` 或 `undefined` 时，回退到 `globalThis`
