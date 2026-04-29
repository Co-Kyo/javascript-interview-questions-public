/**
 * 深拷贝 - 支持循环引用、特殊对象类型
 * 核心思路：递归 + WeakMap 记录已拷贝对象解决循环引用
 */

function deepClone(obj, cache = new WeakMap()) {
  // 1. 基本类型直接返回（null 也是 object，需要前置判断）
  // typeof 函数返回 'function'，不会进入后续对象处理逻辑，自然返回引用
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // 2. 循环引用：如果已经拷贝过，直接返回缓存的副本
  if (cache.has(obj)) {
    return cache.get(obj);
  }

  // 3. 特殊对象类型处理
  // Error（面试常追问）
  if (obj instanceof Error) {
    const errCopy = new obj.constructor(obj.message);
    errCopy.stack = obj.stack;
    return errCopy;
  }

  // Date
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  // RegExp
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags);
  }

  // Map
  if (obj instanceof Map) {
    const mapCopy = new Map();
    cache.set(obj, mapCopy); // 先缓存，防止值中引用自身
    obj.forEach((value, key) => {
      mapCopy.set(deepClone(key, cache), deepClone(value, cache));
    });
    return mapCopy;
  }

  // Set
  if (obj instanceof Set) {
    const setCopy = new Set();
    cache.set(obj, setCopy);
    obj.forEach((value) => {
      setCopy.add(deepClone(value, cache));
    });
    return setCopy;
  }

  // 4. 普通对象 & 数组：创建空壳 → 缓存 → 递归填充
  const clone = Array.isArray(obj) ? [] : Object.create(Object.getPrototypeOf(obj));
  cache.set(obj, clone); // 必须在递归前缓存，否则循环引用会死循环

  // 处理普通可枚举属性
  for (const key of Object.keys(obj)) {
    clone[key] = deepClone(obj[key], cache);
  }

  // 处理 Symbol 属性（可枚举的）
  const symbolKeys = Object.getOwnPropertySymbols(obj);
  for (const sym of symbolKeys) {
    if (Object.propertyIsEnumerable.call(obj, sym)) {
      clone[sym] = deepClone(obj[sym], cache);
    }
  }

  return clone;
}

// ========== 测试用例 ==========

// 基本类型
console.log(deepClone(42));           // 42
console.log(deepClone('hello'));      // 'hello'
console.log(deepClone(null));         // null
console.log(deepClone(undefined));    // undefined
console.log(deepClone(42n));          // 42n (BigInt)
const symPrim = Symbol('prim');
console.log(deepClone(symPrim) === symPrim);  // true (Symbol 原始值直接返回)

// 嵌套对象
const obj1 = { a: 1, b: { c: 2, d: [3, 4] } };
const c1 = deepClone(obj1);
c1.b.d.push(5);
console.log('嵌套:', obj1.b.d);       // [3, 4] 不受影响

// 循环引用
const obj2 = { name: 'root' };
obj2.self = obj2;
const c2 = deepClone(obj2);
console.log('自引用:', c2.self === c2);    // true
console.log('不是同一对象:', c2.self !== obj2); // true

// 互引用
const a = { name: 'a' };
const b = { name: 'b' };
a.ref = b;
b.ref = a;
const ca = deepClone(a);
console.log('互引用:', ca.ref.ref === ca); // true

// 特殊类型
const obj3 = {
  date: new Date('2024-01-01'),
  reg: /hello/gi,
  map: new Map([['key', 'value']]),
  set: new Set([1, 2, 3]),
  fn: function () { return 1; },
};
const c3 = deepClone(obj3);
console.log('Date:', c3.date instanceof Date, c3.date !== obj3.date);
console.log('RegExp:', c3.reg.source, c3.reg.flags);
console.log('Map:', c3.map.get('key'));
console.log('Set:', c3.set.has(1));
console.log('函数引用相同:', c3.fn === obj3.fn); // true（函数不拷贝）

// Symbol 属性
const sym = Symbol('test');
const obj4 = { [sym]: 'symValue', normal: 1 };
const c4 = deepClone(obj4);
console.log('Symbol:', c4[sym] === 'symValue');

// Error 对象
const err = new Error('something went wrong');
const clonedErr = deepClone(err);
console.log('Error:', clonedErr.message === 'something went wrong', clonedErr instanceof Error, clonedErr !== err);
