# 手写 call / apply / bind — 引导式讲解

## 0. 这道题在解决什么问题？

函数里的 `this` 指向谁，取决于你怎么调用——`obj.fn()` 时 `this` 是 `obj`，单独调用 `fn()` 时 `this` 就跑了。`call`、`apply`、`bind` 就是让你手动控制 `this` 指向谁。

---

## 1. 最小尝试：让 this 指向一个对象

核心规则：**`obj.fn()` 调用时，`this` 指向 `obj`**。最简单的办法——挂上去，调用，删掉。

```javascript
function myCall(fn, obj) {
  obj.temp = fn;
  const result = obj.temp();
  delete obj.temp;
  return result;
}
```

> 💡 挂 → 调 → 删，隐式绑定生效。

---

## 2. 发现问题：临时键冲突

**困境**：`obj` 上已有 `temp` 属性就会被覆盖，`delete` 后原属性丢失。

**思考**：怎么保证临时键永远不冲突？

**解法**：`Symbol('fn')` 每次生成全局唯一值，不可能和已有属性重名。

```diff
- obj.temp = fn;
- const result = obj.temp();
- delete obj.temp;
+ const fnKey = Symbol('fn');
+ obj[fnKey] = fn;
+ const result = obj[fnKey]();
+ delete obj[fnKey];
```

**验证**：`obj` 有 `temp` 属性也不冲突。

---

## 3. 发现问题：null 和原始值

**困境**：`myCall(fn, null)` 报错，`myCall(fn, 42)` 也挂不上属性。

**思考**：原生 `call` 怎么处理这些值？

**解法**：① `== null` 捕获 null/undefined，回退 `globalThis`；② `Object()` 把原始值转包装对象。

```diff
  function myCall(fn, obj) {
+   obj = obj == null ? globalThis : Object(obj);
    const fnKey = Symbol('fn');
```

**验证**：null 和 42 都不报错。

---

## 4. 改成原型方法：myCall

**困境**：原生用法是 `fn.myCall(obj)`，fn 是 `this` 不是参数。

**思考**：`fn.myCall(obj)` 中 `this` 是谁？

**解法**：挂到 `Function.prototype`，用 `this` 代替 fn 参数，`...args` 收集剩余参数。

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

**验证**：`greet.myCall(person, 'Hello', '!')` 返回 `"Hello, Alice!"`

---

## 5. myApply：参数是数组

**困境**：`apply` 和 `call` 唯一区别——第二个参数是数组，且需要类型校验。

**思考**：传了非数组怎么办？

**解法**：复制 myCall 逻辑，改两处：① 参数从 `argsArray` 展开；② `Array.isArray` 校验，非数组抛 TypeError。

```javascript
Function.prototype.myApply = function (thisArg, argsArray) {
  thisArg = thisArg == null ? globalThis : Object(thisArg);
  if (argsArray != null && !Array.isArray(argsArray)) {
    throw new TypeError('second argument must be an array');
  }
  const fnKey = Symbol('fn');
  thisArg[fnKey] = this;
  const result = argsArray ? thisArg[fnKey](...argsArray) : thisArg[fnKey]();
  delete thisArg[fnKey];
  return result;
};
```

**验证**：`greet.myApply(person, ['Hi', '~'])` 返回 `"Hi, Alice~"`

---

## 6. 发现问题：bind 不立即执行

**困境**：`bind` 不立即执行，而是返回新函数，需要"记住"原函数和绑定值。

**思考**：新函数需要记住什么？

**解法**：闭包记住 `originalFn`、`thisArg`、`presetArgs`，调用时合并后续参数执行。

```javascript
Function.prototype.myBind = function (thisArg, ...presetArgs) {
  const originalFn = this;
  const bound = function (...laterArgs) {
    const fnKey = Symbol('fn');
    thisArg[fnKey] = originalFn;
    const result = thisArg[fnKey](...presetArgs, ...laterArgs);
    delete thisArg[fnKey];
    return result;
  };
  return bound;
};
```

**验证**：`greet.myBind(person, 'Hey')('?')` 返回 `"Hey, Alice?"`

---

## 7. 发现问题：new 调用时 this 不该被绑定

**困境**：`new BoundPerson(25)` 时 `this` 应是新实例，但 bound 硬编码用了 thisArg，new 失效。

**思考**：怎么区分普通调用和 new 调用？

**解法**：`this instanceof bound` 为 true 说明是 new 调用，用 `this`；否则用 `thisArg`。**new 优先级高于 bind**。

```diff
  const bound = function (...laterArgs) {
-   const fnKey = Symbol('fn');
-   thisArg[fnKey] = originalFn;
+   const context = this instanceof bound ? this : thisArg;
+   const fnKey = Symbol('fn');
+   context[fnKey] = originalFn;
```

**验证**：`new BoundPerson(25)` 创建的实例有 `name` 和 `age` 属性。

---

## 8. 发现问题：instanceof 断裂

**困境**：`p instanceof Person` 返回 false——`bound.prototype` 没连到 `Person.prototype`，原型链断了。

**思考**：怎么继承又不直接引用？

**解法**：`Object.create(originalFn.prototype)` 创建继承自原原型的新对象。直接赋值会污染，`Object.create` 切断引用。

```diff
  return bound;
+ };
+
+ if (originalFn.prototype) {
+   bound.prototype = Object.create(originalFn.prototype);
+ }
```

**验证**：`p instanceof Person` 现在返回 `true` ✅

---

## 9. 细节补全：name 属性

**困境**：原生 bind 返回的函数 name 带 `"bound "` 前缀，但函数 name 默认不可写。

**解法**：`Object.defineProperty` 强制设置，`configurable: true` 保持与原生一致。

```javascript
Object.defineProperty(bound, 'name', {
  value: `bound ${originalFn.name || ''}`.trim(),
  configurable: true,
});
```

**验证**：`Person.myBind(null).name` 返回 `"bound Person"`

---

## 10. 拼在一起：完整实现

```javascript
Function.prototype.myCall = function (thisArg, ...args) {
  thisArg = thisArg == null ? globalThis : Object(thisArg);
  const fnKey = Symbol('fn');
  thisArg[fnKey] = this;
  const result = thisArg[fnKey](...args);
  delete thisArg[fnKey];
  return result;
};

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

每一行都有来路：Symbol→Step2，Object()→Step3，instanceof→Step7，Object.create→Step8。

---

## 面试追问速查

**Q1：手写 new 操作符？** — 三步：创建空对象并链接原型 → 执行构造函数 → 如果返回值是对象就用它，否则用创建的对象。

**Q2：箭头函数能用 bind 吗？** — 不能。箭头函数没有自己的 `this`，继承外层作用域，`bind`/`call`/`apply` 对它无效。

**Q3：连续 bind 的优先级？** — 第一个 `bind` 生效，后续无法覆盖。因为第一次 bind 返回的函数已硬绑定 `this`，再 bind 只是给这个新函数再包一层，但内层的 `thisArg` 已固定。

**Q4：严格模式的区别？** — 严格模式下 `call(null)` 传入的就是 `null`，不会回退到 `globalThis`。当前实现按非严格模式处理，面试时可以主动提及。

---

## 易错点

| 易错点 | 为什么会错 | 正确做法 |
|--------|-----------|---------|
| 忘记处理 `null`/`undefined` | 以为 `thisArg` 一定是对象 | `== null` 统一判断，回退 `globalThis` |
| 忘记处理原始值 | 直接给数字挂属性不报错？其实会 | `Object()` 包装为对象 |
| 用字符串做临时键 | 觉得 `"__fn__"` 不会冲突 | 用 `Symbol` 保证唯一性 |
| bind 不支持 new | 只测试了普通调用 | `instanceof` 检测，`new` 时用新实例 |
| 直接赋值 prototype | `bound.prototype = fn.prototype` 看起来能用 | `Object.create` 切断引用，防污染 |
| 忘记 delete 临时属性 | 调用完没清理 | 用完必须 `delete`，否则对象被污染 |
