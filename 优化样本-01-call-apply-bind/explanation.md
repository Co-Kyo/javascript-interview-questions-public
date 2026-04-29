# 手写 call / apply / bind - 讲解

## 第一步：理解问题

面试官想考察三件事：

1. **`this` 绑定机制** — `this` 不是创建时绑定，而是调时绑定。能说出四种绑定规则（默认、隐式、显式、`new`）及其优先级
2. **原型链** — `bind` 返回的函数需要正确维护 `prototype`，否则 `instanceof` 会断裂
3. **边界意识** — `thisArg` 为原始值、`null`、`undefined` 时怎么处理；临时属性会不会污染目标对象

## 第二步：核心思路

### call / apply 的本质

把一个函数"变成"某个对象的方法，然后调用它：

```
obj.fn()  →  this === obj
```

实现三步走：
1. 把函数挂到目标对象上
2. 调用它（隐式绑定 this）
3. 删掉这个临时方法（不留痕迹）

### bind 的本质

返回一个新函数，记住 `this` 和预设参数。但有个特殊情况：`new` 调用时，绑定的 `this` 要被忽略（`new` 优先级高于 `bind`）。

### 三者对比

| 方法      | 执行时机 | 返回值     | 参数形式        |
| ------- | ---- | ------- | ----------- |
| `call`  | 立即执行 | 函数返回值   | 逐个参数        |
| `apply` | 立即执行 | 函数返回值   | 数组          |
| `bind`  | 延迟执行 | 绑定后的新函数 | 逐个参数（可部分应用） |

## 第三步：逐步实现

### 3.1 myCall

```javascript
Function.prototype.myCall = function (thisArg, ...args) {
  thisArg = thisArg == null ? globalThis : Object(thisArg);

  const fnKey = Symbol('fn');
  thisArg[fnKey] = this;
  const result = thisArg[fnKey](...args);
  delete thisArg[fnKey];

  return result;
};
```

**第一行：处理 thisArg。** `== null` 同时捕获 `null` 和 `undefined`，回退到 `globalThis`。`Object()` 把原始值（`42`、`"hi"`）转为包装对象，因为原始值上无法挂属性。

**中间三行：核心技巧。** 用 `Symbol` 做临时属性键（不会和已有属性冲突），把当前函数挂到 `thisArg` 上，然后通过 `thisArg[fnKey](...args)` 调用——此时 JavaScript 的隐式绑定规则会让 `this` 指向 `thisArg`。调用完立即 `delete`，不留痕迹。

### 3.2 myApply

和 `myCall` 几乎一样，区别只有两点：参数从数组展开，以及增加类型校验。

```javascript
Function.prototype.myApply = function (thisArg, argsArray) {
  thisArg = thisArg == null ? globalThis : Object(thisArg);

  if (argsArray != null && !Array.isArray(argsArray)) {
    throw new TypeError('myApply: second argument must be an array or null/undefined');
  }

  const fnKey = Symbol('fn');
  thisArg[fnKey] = this;
  const result = argsArray ? thisArg[fnKey](...argsArray) : thisArg[fnKey]();
  delete thisArg[fnKey];

  return result;
};
```

多出来的 `if` 判断：`apply` 的第二个参数必须是数组（或 `null`/`undefined` 表示不传参），否则抛 `TypeError`。这是和 `call` 的唯一语义差异。

### 3.3 myBind

`myBind` 更复杂——返回一个新函数，还要处理 `new` 调用和原型链。

```javascript
Function.prototype.myBind = function (thisArg, ...presetArgs) {
  const originalFn = this;

  const bound = function (...laterArgs) {
    const context = this instanceof bound ? this : thisArg;

    const fnKey = Symbol('fn');
    context[fnKey] = originalFn;
    const result = context[fnKey](...presetArgs, ...laterArgs);
    delete context[fnKey];
    return result;
  };

  if (originalFn.prototype) {
    bound.prototype = Object.create(originalFn.prototype);
  }

  Object.defineProperty(bound, 'name', {
    value: `bound ${originalFn.name || ''}`.trim(),
    configurable: true,
  });

  return bound;
};
```

**`this instanceof bound` — 这是整道题最关键的一行。** 当 `new BoundPerson()` 被调用时，JavaScript 会创建一个新对象作为 `this`，并且这个新对象是 `bound` 的实例。所以用 `instanceof` 检测就能区分"普通调用"和 `new` 调用。`new` 的优先级高于 `bind`，所以 `new` 时用新实例作为 context，普通调用时用绑定的 `thisArg`。

**`Object.create(originalFn.prototype)` — 而非直接赋值。** 如果写 `bound.prototype = originalFn.prototype`，那么给 `bound.prototype` 加属性就会污染原函数的原型。用 `Object.create` 创建一个继承自原原型的新对象，切断引用。

**`Object.defineProperty` 设置 name —** 原生 `bind` 返回的函数，`name` 属性会带 `"bound "` 前缀。这里用 `defineProperty` 模拟，因为函数的 `name` 属性默认是不可写的。

## 第四步：常见追问

### 追问 1：手写 new 操作符

`new` 的本质是三步：创建对象 → 执行构造函数 → 判断返回值。

```javascript
function myNew(Constructor, ...args) {
  const obj = Object.create(Constructor.prototype);
  const result = Constructor.apply(obj, args);
  return result instanceof Object ? result : obj;
}
```

第三步是关键：如果构造函数显式返回了一个对象，`new` 就用那个对象而不是自己创建的。

### 追问 2：箭头函数的 bind

箭头函数没有自己的 `this`，它的 `this` 继承自外层作用域。`bind`/`call`/`apply` 无法改变箭头函数的 `this`——这是语言设计，不是实现限制。

### 追问 3：连续 bind 的优先级

```javascript
const fn = getName.bind(obj1).bind(obj2);
fn(); // 'A'（第一次 bind 生效）
```

第一次 `bind` 返回的函数已经硬绑定了 `this`，后续 `bind` 无法覆盖。因为 `bind` 的规则是：一旦绑定，不可覆盖（`new` 除外）。

### 追问 4：严格模式差异

严格模式下，`call(null)` 传入的就是 `null`，不会回退到 `globalThis`。当前实现统一回退到 `globalThis`（与非严格模式行为一致）。面试中可以主动提及这个差异，展示对语言细节的掌握。

## 第五步：易错点

| 易错点 | 说明 |
|-------|------|
| 忘记处理 `null`/`undefined` | `thisArg[fnKey]` 会报错 |
| 忘记处理原始值 | `myCall(42, ...)` 不能直接给数字加属性 |
| 用字符串做临时属性键 | 可能覆盖已有属性，应用 `Symbol` |
| bind 不支持 new | 最常见错误！`new` 时 `this` 应指向新实例 |
| 不维护原型链 | `new BoundFn()` 的实例 `instanceof OriginalFn` 应为 `true` |
| 忘记清理临时属性 | 用完必须 `delete`，否则污染对象 |
