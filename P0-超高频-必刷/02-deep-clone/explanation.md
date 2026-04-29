# 深拷贝（含循环引用）— 五步讲解

## 第一步：理解问题

深拷贝的核心目标是：**创建一个与原对象完全独立的副本**，修改副本不会影响原对象。

与浅拷贝的区别：
- 浅拷贝只复制一层，嵌套对象仍然是引用
- 深拷贝递归复制所有层级，完全断开引用关系

**为什么不能用 JSON.parse(JSON.stringify())？**

| 场景 | JSON 方案结果 | 期望结果 |
|------|-------------|---------|
| `undefined` | 丢失 | 保留 |
| `function` | 丢失 | 保留引用 |
| `Date` | 变成字符串 | Date 实例 |
| `RegExp` | 变成空对象 | RegExp 实例 |
| `Map / Set` | 变成空对象 | Map / Set 实例 |
| `循环引用` | 抛错 | 正常拷贝 |
| `Symbol` 属性 | 丢失 | 保留 |

## 第二步：核心思路 — 为什么用 WeakMap

循环引用问题的本质：对象 A 引用 B，B 又引用 A，递归进入无限死循环。

**解决方案**：用一个"缓存"记录已经拷贝过的对象，遇到重复的直接返回副本。

```javascript
// 为什么是 WeakMap 而不是 Map？
// 1. WeakMap 的 key 必须是对象 — 正好符合我们的场景（只有对象需要缓存）
// 2. WeakMap 是弱引用 — 如果原对象被 GC 回收，缓存条目也会自动清除，不会内存泄漏
// 3. Map 作为 key 会强引用原对象，即使外部不再使用该对象，Map 仍持有引用，导致无法 GC
```

**执行流程**：
```
deepClone(objA)
  → cache 中没有 objA
  → 创建 cloneA，存入 cache: { objA → cloneA }
  → 递归拷贝 objA.ref（即 objB）
    → deepClone(objB)
      → 创建 cloneB，存入 cache: { objA → cloneA, objB → cloneB }
      → 递归拷贝 objB.ref（即 objA）
        → deepClone(objA)
          → cache 中有 objA → 直接返回 cloneA ✅ 不再递归
```

## 第三步：逐步实现

### 3.1 基本类型判断

```javascript
if (obj === null || typeof obj !== 'object') {
  return obj;
}
```
- `null` 的 `typeof` 是 `'object'`，必须前置判断
- 基本类型直接返回，不需要拷贝
- 函数的 `typeof` 是 `'function'`，不会进入此分支，自然返回引用（不拷贝函数体）

### 3.2 循环引用检查

```javascript
if (cache.has(obj)) {
  return cache.get(obj);
}
```
如果已经拷贝过这个对象，直接返回之前的副本，打断递归。

### 3.3 特殊类型处理

每种特殊类型需要单独构造：
- `Error` → `new obj.constructor(obj.message)` + 保留 stack（面试常追问）
- `Date` → `new Date(timestamp)`
- `RegExp` → `new RegExp(source, flags)`
- `Map` → 遍历 `forEach`，key 和 value 都递归拷贝
- `Set` → 遍历 `forEach`，value 递归拷贝

**关键细节**：Map 和 Set 必须 **先存入 cache 再遍历**，否则遇到值引用自身时仍然会死循环。

### 3.4 普通对象 & 数组

```javascript
const clone = Array.isArray(obj) ? [] : Object.create(Object.getPrototypeOf(obj));
cache.set(obj, clone);  // 先缓存，再递归
for (const key of Object.keys(obj)) {
  clone[key] = deepClone(obj[key], cache);
}
```

使用 `Object.create(Object.getPrototypeOf(obj))` 保留原型链，使 `clone instanceof MyClass` 等判断仍然成立。

### 3.5 Symbol 属性

普通 `for...in` 和 `Object.keys()` 都不会遍历 Symbol 属性，需要额外用 `Object.getOwnPropertySymbols()` 获取。

## 第四步：常见变体

### 4.1 structuredClone（现代方案）

```javascript
// 浏览器原生深拷贝（Node.js 17.0+ / Chrome 98+ / Firefox 94+ / Safari 15.4+）
const cloned = structuredClone(value);
```

**优点**：原生支持循环引用、Date、RegExp、Map、Set、ArrayBuffer 等
**缺点**：
- 不支持函数（会抛错）
- 不支持 DOM 节点
- 不支持 Symbol 属性
- 不能拷贝原型链

### 4.2 lodash _.cloneDeep

工业级方案，处理了几乎所有边界情况（Error、TypedArray、Buffer 等），但体积较大。

### 4.3 MessageChannel 黑科技

```javascript
function deepClone(obj) {
  return new Promise((resolve) => {
    const { port1, port2 } = new MessageChannel();
    port1.postMessage(obj);
    port2.onmessage = (e) => resolve(e.data);
  });
}
```
利用浏览器消息传递的结构化克隆算法，但是异步的，且有大小限制。

## 第五步：易错点

### ❌ 易错 1：先递归再缓存

```javascript
// 错误！循环引用时死循环
const clone = {};
for (const key of Object.keys(obj)) {
  clone[key] = deepClone(obj[key], cache);
}
cache.set(obj, clone);  // ← 太晚了
```

**正确**：创建空壳后立即 `cache.set`，再递归填充。

### ❌ 易错 2：忘记处理 null

```javascript
if (typeof obj !== 'object') return obj;
// 当 obj 为 null 时，typeof null === 'object'，会进入后续逻辑导致崩溃
```

### ❌ 易错 3：用 Map 代替 WeakMap

```javascript
const cache = new Map();  // 会强引用所有拷贝过的对象
// 即使外部不再需要这些对象，GC 也无法回收
```

### ❌ 易错 4：忽略 Symbol 键

```javascript
const sym = Symbol('id');
const obj = { [sym]: 123 };
// Object.keys(obj) → []，Symbol 属性丢失
```

### ❌ 易错 5：Map 的 key 是对象时没递归

```javascript
const key = { id: 1 };
const map = new Map([[key, 'value']]);
// 如果只拷贝 value 不拷贝 key，key 仍然是原对象的引用
```

### ❌ 易错 6：函数的处理策略

面试时要主动说明：函数通常不深拷贝（闭包依赖外部作用域，拷贝函数体没有意义），直接返回引用即可。如果面试官追问，可以提到 `new Function(fn.toString())` 这种黑魔法（会丢失闭包）。

### ❌ 易错 7：Error 对象的处理

```javascript
const err = new Error('fail');
const clone = deepClone(err);
// 如果走普通对象分支，clone.message 会丢失（Error 的 message 不是可枚举属性）
// 正确做法：用 new obj.constructor(obj.message) 构造，并保留 stack
```

### ❌ 易错 8：RegExp 的 lastIndex 状态

```javascript
const reg = /hello/g;
reg.exec('hello world');  // lastIndex 变为 5
const clone = deepClone(reg);
// clone.lastIndex 为 0，不保留原正则的匹配状态
// 实际面试中通常不追问，但值得主动提及
```

---

**面试评分建议**：
- 基础版（递归 + 数组/对象）：60 分
- 加上循环引用处理（WeakMap）：75 分
- 加上 Date/RegExp/Map/Set：85 分
- 加上 Symbol 属性 + 原型链保留：90 分
- 主动讨论 structuredClone 及方案取舍：95+ 分
