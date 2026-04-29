# 手写 call / apply / bind - 讲解

## 第一步：理解问题

面试官通过这道题想考察的核心能力：

1. **对 `this` 机制的深度理解**——`this` 不是函数创建时绑定，而是调用时绑定，能说出四种绑定规则（默认、隐式、显式、`new`）及其优先级
2. **原型链与面向对象基础**——`bind` 返回的函数需要正确维护 `prototype`，否则 `instanceof` 会断裂
3. **边界意识**——`thisArg` 为原始值、`null`、`undefined` 时如何处理；临时属性是否会污染目标对象

这不是"背 API"的题，而是考察你是否理解 JavaScript 函数调用的本质。

## 第二步：核心思路

### call / apply 的本质

> 把一个函数"变成"某个对象的方法，然后调用它。

```
obj.fn()  →  this === obj
```

所以我们需要：
1. 把函数挂到目标对象上
2. 调用 `obj.fn(...args)`
3. 删掉这个临时方法（不污染）

### bind 的本质

> 返回一个新函数，记住 `this` 和预设参数。

但有一个特殊情况：`new` 调用时，绑定的 `this` 要被忽略（`new` 的优先级高于 `bind`）。

### 三者的关键差异

| 方法 | 执行时机 | 返回值 | 参数形式 |
|------|---------|--------|---------|
| `call` | 立即执行 | 函数返回值 | 逐个参数 |
| `apply` | 立即执行 | 函数返回值 | 数组 |
| `bind` | 延迟执行 | 绑定后的新函数 | 逐个参数（可部分应用） |

## 第三步：逐步实现

### 3.1 myCall 实现解析

```javascript
Function.prototype.myCall = function (thisArg, ...args) {
  // 1. 处理 thisArg：null/undefined → globalThis，原始值 → 包装对象
  thisArg = thisArg == null ? globalThis : Object(thisArg);
  //    ^^^^^^^^^^^^^^^^^^^^
  //    == null 同时捕获 null 和 undefined
  //    Object(42) → Number {42}, Object('hi') → String {'hi'}

  // 2. 用 Symbol 作为临时属性键，避免与已有属性冲突
  const fnKey = Symbol('fn');
  thisArg[fnKey] = this;
  //           ^^^^
  //    this 就是调用 myCall 的那个函数
  //    例如 greet.myCall(person) 中 this === greet

  // 3. 以方法调用的形式执行，隐式绑定 this 为 thisArg
  const result = thisArg[fnKey](...args);

  // 4. 清理临时属性，不留痕迹
  delete thisArg[fnKey];

  return result;
};
```

**为什么要用 `Symbol`？** 如果用字符串 `'fn'` 作为键，万一 `thisArg` 本身就有 `fn` 属性就会被覆盖。`Symbol` 每次都是唯一的，不会冲突。

### 3.2 myApply 实现解析

与 `myCall` 几乎完全一样，区别在于：参数从数组展开，且增加类型校验（非数组/非 null/undefined 应抛 TypeError）：

```javascript
Function.prototype.myApply = function (thisArg, argsArray) {
  thisArg = thisArg == null ? globalThis : Object(thisArg);

  // 类型校验：argsArray 必须是数组、null 或 undefined
  if (argsArray != null && !Array.isArray(argsArray)) {
    throw new TypeError('myApply: second argument must be an array or null/undefined');
  }

  const fnKey = Symbol('fn');
  thisArg[fnKey] = this;

  // 区别在这里：argsArray 存在则展开，不存在则不传参数
  const result = argsArray ? thisArg[fnKey](...argsArray) : thisArg[fnKey]();

  delete thisArg[fnKey];
  return result;
};
```

### 3.3 myBind 实现解析

`myBind` 更复杂，需要返回一个新函数，并处理 `new` 调用场景：

```javascript
Function.prototype.myBind = function (thisArg, ...presetArgs) {
  const originalFn = this; // 保存原函数引用

  const bound = function (...laterArgs) {
    // 关键判断：是否通过 new 调用？
    // new 调用时，函数内的 this 是新创建的实例
    // this instanceof bound 为 true → 说明是 new 调用
    const context = this instanceof bound ? this : thisArg;

    // 合并预设参数和后续参数（柯里化效果）
    // 不使用原生 apply，改用临时属性挂载方式（与 myCall/myApply 一致）
    // 这样三个方法的实现思路统一，且完全不依赖原生 call/apply/bind
    const fnKey = Symbol('fn');
    context[fnKey] = originalFn;
    const result = context[fnKey](...presetArgs, ...laterArgs);
    delete context[fnKey];
    return result;
  };

  // 维护原型链：让 new Bound() 创建的实例能通过 instanceof Person 检查
  if (originalFn.prototype) {
    bound.prototype = Object.create(originalFn.prototype);
    //                               ^^^^^^^^^^^^^^^^^^^^^^
    //    用 Object.create 而非直接赋值，是为了切断引用
    //    修改 bound.prototype 不会影响 originalFn.prototype
  }

  // 维护函数名：myBind 返回的函数 name 应为 "bound <原函数名>"
  // 原生 bind 的函数 name 以 "bound " 前缀开头，这里用 Object.defineProperty 模拟
  Object.defineProperty(bound, 'name', {
    value: `bound ${originalFn.name || ''}`.trim(),
    configurable: true,
  });

  return bound;
};
```

**为什么要判断 `this instanceof bound`？**

看这个场景：
```javascript
function Person(name) { this.name = name; }
const BoundPerson = Person.myBind({ x: 1 }, 'Bob');
const p = new BoundPerson(); // 期望 this 是新实例，不是 { x: 1 }
```

`new` 的语义是创建新对象，优先级高于 `bind` 绑定的 `this`。所以必须检测是否是 `new` 调用。

## 第四步：常见变体与追问

### 追问 1：手写 new 操作符

```javascript
function myNew(Constructor, ...args) {
  const obj = Object.create(Constructor.prototype);
  const result = Constructor.apply(obj, args);
  return result instanceof Object ? result : obj;
}
```

### 追问 2：用 call 实现 apply，用 apply 实现 call

```javascript
Function.prototype.myApply = function (thisArg, args) {
  return this.myCall(thisArg, ...(args || []));
};
```

### 追问 3：bind 的柯里化应用

```javascript
// 实际场景：React 事件处理
this.handleClick = this.handleClick.bind(this, itemId);
// 预绑定 itemId，点击时自动传入
```

### 追问 4：箭头函数的 bind

箭头函数没有自己的 `this`，`bind`/`call`/`apply` 无法改变它的 `this` 指向——面试官可能问你能否实现一个"可绑定的箭头函数"（答案是不能，这是语言设计）。

### 追问 5：连续 bind 的优先级

```javascript
const obj1 = { name: 'A' };
const obj2 = { name: 'B' };
function getName() { return this.name; }

const fn = getName.bind(obj1).bind(obj2);
fn(); // 'A'（第一次 bind 生效，后续 bind 无法覆盖）
// 这是因为第一次 bind 返回的函数已经硬绑定了 this
```

## 第五步：复杂度分析

三个方法的时间和空间复杂度均为 **O(1)**：

| 方法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| `myCall` | O(1) | O(1) | 临时属性创建+删除，Symbol 开销可忽略 |
| `myApply` | O(1) | O(1) | 同 myCall |
| `myBind` | O(1) | O(1) | 创建闭包 + Object.create，不随输入增长 |

> 注意：函数本身的执行时间取决于业务逻辑，这里讨论的是"绑定机制"的开销。

## 第六步：严格模式行为差异

原生 `call`/`apply` 在严格模式下，`null`/`undefined` **不会**被替换为全局对象：

```javascript
'use strict';
function getThis() { return this; }

getThis.call(null);      // null（严格模式）
getThis.call(null);      // window/globalThis（非严格模式）
```

**手写实现的处理**：当前实现一律将 `null`/`undefined` 替换为 `globalThis`，这与非严格模式行为一致。在面试中，可以主动提及这一差异，展示对语言细节的掌握。如果需要完全模拟原生行为，需要检测当前是否处于严格模式（可通过 `try/catch` 或 `arguments.callee` 等方式，但实现复杂且收益低）。

## 第七步：易错点总结

| 易错点 | 说明 |
|-------|------|
| **忘记处理 `null`/`undefined`** | 不传 `thisArg` 或传 `null` 时应回退到 `globalThis`，否则 `thisArg[fnKey]` 会报错 |
| **忘记处理原始值** | `myCall(42, ...)` 不能直接给数字加属性，需要 `Object(42)` 包装 |
| **用字符串做临时属性键** | 可能覆盖目标对象的已有属性，应使用 `Symbol` |
| **bind 不支持 new** | 最常见错误！`bind` 返回的函数被 `new` 调用时，`this` 应指向新实例而非绑定对象 |
| **不维护原型链** | `new BoundFn()` 创建的实例 `instanceof OriginalFn` 应为 `true` |
| **忘记清理临时属性** | 用完 `thisArg[fnKey]` 后必须 `delete`，否则污染对象 |
| **bind 返回函数的 prototype 被修改影响原函数** | 必须用 `Object.create` 创建新对象，而非直接引用 |
