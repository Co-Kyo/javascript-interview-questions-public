# 深拷贝（含循环引用）— 引导式讲解

## 0. 这道题在解决什么问题？

你有一份复杂的配置对象，里面嵌套了对象、数组、甚至还有循环引用。你想复制一份给另一个模块用，但改了副本之后，原件也被改了——这就是浅拷贝的坑。深拷贝要做的，就是**递归复制所有层级，创建一个与原对象完全独立的副本**，改副本不影响原件。

日常类比：你想复印一份手写信，不能只复印信封（浅拷贝），得把信纸也一张张复印（深拷贝），否则你改了复印件上的字，原件也被划了。

---

## 1. 最小尝试：基本类型判断

深拷贝的第一步——哪些值不需要拷贝？

```javascript
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  // 对象怎么办？先留空
}
```

> 💡 基本类型（number、string、boolean、undefined）和 null 直接返回，不需要拷贝。函数也走这个分支（typeof === 'function'），返回引用即可。

**验证**：`deepClone(42)` → `42`，`deepClone(null)` → `null` ✅

---

## 2. 发现问题：浅拷贝的陷阱

上面的代码遇到对象就停了。最暴力的做法——直接返回原对象？那改了副本就改了原件。

**思考**：对象需要"递归地"逐层拷贝，但如果对象引用了自身（循环引用），递归就永远不会停。怎么办？

**解法**：用一个"缓存"记录已拷贝过的对象，遇到重复的直接返回副本。这个缓存就是 **WeakMap**——key 必须是对象（正好），弱引用不会阻止 GC（内存安全）。

```javascript
function deepClone(obj, cache = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (cache.has(obj)) return cache.get(obj); // 循环引用：直接返回
  // ...
}
```

**验证**：`const a = {}; a.self = a; deepClone(a)` — 不再无限递归 ✅

---

## 3. 先缓存后递归：一个关键设计模式

有了 WeakMap，什么时候存入缓存？答案：**创建空壳后立即存入，再递归填充**。

**思考**：如果先递归再存缓存，Map 的 value 引用自身时还是死循环。为什么？

**解法**：先 `cache.set(obj, clone)` 把空壳存入，后续递归遇到同一个 obj 时能命中缓存，立刻返回。这就是"先缓存后递归"模式。

```javascript
const clone = Array.isArray(obj) ? [] : {};
cache.set(obj, clone); // ← 先存空壳
for (const key of Object.keys(obj)) {
  clone[key] = deepClone(obj[key], cache); // ← 再递归填充
}
```

**验证**：`const a = {}; a.self = a; const b = deepClone(a); b.self === b` → true，且 `b !== a` ✅

---

## 4. Date 处理

Date 对象用 `typeof` 判断也是 `'object'`，但直接当普通对象拷贝会丢失时间信息。

**思考**：Date 的内部值是什么？怎么提取？

**解法**：`new Date(obj.getTime())`——用时间戳重新构造，干净利落。

```javascript
if (obj instanceof Date) {
  return new Date(obj.getTime());
}
```

**验证**：`const d = new Date('2024-01-01'); deepClone(d).getTime() === d.getTime()` → true ✅

---

## 5. RegExp 处理

RegExp 也是 object，直接当普通对象拷贝会变成空对象。

**思考**：正则有哪些组成部分？source + flags。

**解法**：`new RegExp(obj.source, obj.flags)` 重新构造。

```javascript
if (obj instanceof RegExp) {
  return new RegExp(obj.source, obj.flags);
}
```

**验证**：`const r = /hello/gi; deepClone(r).source === 'hello'` → true ✅

---

## 6. Error 处理

Error 的 `message` 不是可枚举属性，走普通对象分支会丢失。

**思考**：怎么既保留 message 又保留 stack？

**解法**：用构造函数重新创建，然后手动赋值 stack。

```javascript
if (obj instanceof Error) {
  const errCopy = new obj.constructor(obj.message);
  errCopy.stack = obj.stack;
  return errCopy;
}
```

**验证**：`const e = new Error('fail'); deepClone(e).message === 'fail'` → true ✅

---

## 7. Map 处理

Map 不能用 Object.keys 遍历，而且 key 也可能是对象需要递归。

**思考**：Map 的 key 和 value 都可能引用自身，怎么办？

**解法**：**先缓存空壳 Map，再 forEach 递归拷贝 key 和 value**。这就是"先缓存后递归"模式的再次应用。

```javascript
if (obj instanceof Map) {
  const mapCopy = new Map();
  cache.set(obj, mapCopy);
  obj.forEach((v, k) => {
    mapCopy.set(deepClone(k, cache), deepClone(v, cache));
  });
  return mapCopy;
}
```

**验证**：Map 的 value 引用自身 → 不死循环 ✅

---

## 8. Set 处理

Set 与 Map 类似，但没有 key，只有 value。

**思考**：Set 的 value 引用自身时，同样需要先缓存再遍历。

**解法**：先缓存空壳 Set，再 forEach 递归拷贝 value。

```javascript
if (obj instanceof Set) {
  const setCopy = new Set();
  cache.set(obj, setCopy);
  obj.forEach((v) => setCopy.add(deepClone(v, cache)));
  return setCopy;
}
```

**验证**：Set 含自身引用 → 正常拷贝 ✅

---

## 9. 原型链保留 + 普通对象/数组

前面的 `[] : {}` 有两个问题：(1) 丢失了原型链，(2) 数组之外的类实例也变成了普通对象。

**思考**：`obj instanceof MyClass` 在拷贝后还要成立，怎么保留原型？

**解法**：`Object.create(Object.getPrototypeOf(obj))`——以原对象的原型为新对象的原型。数组会自动走到 `Array.isArray` 分支用 `[]`，普通对象保留原型链。

```javascript
const clone = Array.isArray(obj)
  ? []
  : Object.create(Object.getPrototypeOf(obj));
cache.set(obj, clone);
for (const key of Object.keys(obj)) {
  clone[key] = deepClone(obj[key], cache);
}
```

**验证**：`class A {}; const a = new A(); deepClone(a) instanceof A` → true ✅

---

## 10. Symbol 属性

`Object.keys()` 和 `for...in` 都不遍历 Symbol 键，会丢失。

**思考**：怎么拿到 Symbol 键？所有 Symbol 键都要拷贝吗？

**解法**：`Object.getOwnPropertySymbols(obj)` 获取，再用 `propertyIsEnumerable` 过滤——只拷贝可枚举的，与普通属性行为一致。

```javascript
const symKeys = Object.getOwnPropertySymbols(obj);
for (const sym of symKeys) {
  if (Object.propertyIsEnumerable.call(obj, sym)) {
    clone[sym] = deepClone(obj[sym], cache);
  }
}
```

**验证**：`const s = Symbol('id'); const obj = {[s]: 1}; deepClone(obj)[s]` → 1 ✅

---

## 11. 拼在一起：完整实现

```javascript
function deepClone(obj, cache = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (cache.has(obj)) return cache.get(obj);
  if (obj instanceof Error) {
    const e = new obj.constructor(obj.message);
    e.stack = obj.stack;
    return e;
  }
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof RegExp) return new RegExp(obj.source, obj.flags);
  if (obj instanceof Map) {
    const m = new Map();
    cache.set(obj, m);
    obj.forEach((v, k) => m.set(deepClone(k, cache), deepClone(v, cache)));
    return m;
  }
  if (obj instanceof Set) {
    const s = new Set();
    cache.set(obj, s);
    obj.forEach((v) => s.add(deepClone(v, cache)));
    return s;
  }
  const clone = Array.isArray(obj)
    ? []
    : Object.create(Object.getPrototypeOf(obj));
  cache.set(obj, clone);
  for (const key of Object.keys(obj)) {
    clone[key] = deepClone(obj[key], cache);
  }
  const symKeys = Object.getOwnPropertySymbols(obj);
  for (const sym of symKeys) {
    if (Object.propertyIsEnumerable.call(obj, sym)) {
      clone[sym] = deepClone(obj[sym], cache);
    }
  }
  return clone;
}
```

现在你理解了每一行——不是魔法，是步骤 1 到 10 的累积。

---

## 面试追问速查

- **为什么用 WeakMap 不用 Map？** Map 强引用阻止 GC，WeakMap 弱引用自动清理。
- **structuredClone 能替代吗？** 不支持函数和 Symbol 属性，不能保留原型链。
- **函数为什么不拷贝？** 闭包依赖外部作用域，拷贝函数体没意义，返回引用即可。
- **Map 的 key 是对象时要递归吗？** 要，否则 key 仍是原对象引用。
- **RegExp 的 lastIndex 要保留吗？** `new RegExp()` 会重置为 0，面试时可主动提及。

---

## 易错点

| 易错点 | 为什么会错 | 正确做法 |
|--------|-----------|---------|
| 先递归再缓存 | 循环引用时 cache.set 太晚，仍会死循环 | 创建空壳后立即 cache.set |
| 忘记判断 null | `typeof null === 'object'` 会进入对象分支 | 前置 `obj === null` 判断 |
| 用 Map 代替 WeakMap | 强引用阻止 GC，导致内存泄漏 | 用 WeakMap |
| 忽略 Symbol 键 | Object.keys() 不含 Symbol | 用 getOwnPropertySymbols |
| Map key 不递归 | key 是对象时仍是引用 | key 和 value 都递归拷贝 |
| Error 走普通对象分支 | message 不可枚举，会丢失 | 用 constructor 重建 + 保留 stack |
