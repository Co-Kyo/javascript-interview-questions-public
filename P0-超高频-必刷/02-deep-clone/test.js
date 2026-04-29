const { deepClone } = require('./solution.js');

// 基本类型
console.assert(deepClone(42) === 42, 'number');
console.assert(deepClone('hello') === 'hello', 'string');
console.assert(deepClone(null) === null, 'null');
console.assert(deepClone(undefined) === undefined, 'undefined');
console.assert(deepClone(42n) === 42n, 'bigint');
const symPrim = Symbol('prim');
console.assert(deepClone(symPrim) === symPrim, 'symbol 原始值直接返回');
console.assert(deepClone(true) === true, 'boolean');

// 嵌套对象
const obj1 = { a: 1, b: { c: 2, d: [3, 4] } };
const c1 = deepClone(obj1);
c1.b.d.push(5);
console.assert(obj1.b.d.length === 2, '嵌套对象深拷贝，修改副本不影响原对象');
console.assert(c1.a === 1, '嵌套对象值正确');

// 循环引用 - 自引用
const obj2 = { name: 'root' };
obj2.self = obj2;
const c2 = deepClone(obj2);
console.assert(c2.self === c2, '自引用关系保持');
console.assert(c2.self !== obj2, '不是同一个对象');
console.assert(c2.name === 'root', '自引用对象值正确');

// 循环引用 - 互引用
const a = { name: 'a' };
const b = { name: 'b' };
a.ref = b;
b.ref = a;
const ca = deepClone(a);
console.assert(ca.ref.ref === ca, '互引用关系保持');
console.assert(ca.ref !== b, '互引用不是同一个对象');

// Date
const date = new Date('2024-01-01');
const clonedDate = deepClone(date);
console.assert(clonedDate instanceof Date, 'Date 类型保持');
console.assert(clonedDate !== date, 'Date 不是同一个对象');
console.assert(clonedDate.getTime() === date.getTime(), 'Date 值一致');

// RegExp
const reg = /hello/gi;
const clonedReg = deepClone(reg);
console.assert(clonedReg instanceof RegExp, 'RegExp 类型保持');
console.assert(clonedReg.source === 'hello', 'RegExp source 正确');
console.assert(clonedReg.flags === 'gi', 'RegExp flags 正确');
console.assert(clonedReg !== reg, 'RegExp 不是同一个对象');

// Map
const map = new Map([['key', 'value'], [{ id: 1 }, { data: true }]]);
const clonedMap = deepClone(map);
console.assert(clonedMap instanceof Map, 'Map 类型保持');
console.assert(clonedMap.get('key') === 'value', 'Map string key 正确');
console.assert(clonedMap !== map, 'Map 不是同一个对象');

// Map key 也是对象时需要深拷贝
const mapKeys = Array.from(clonedMap.keys());
const objKey = mapKeys.find(k => typeof k === 'object');
console.assert(objKey !== undefined, 'Map 对象 key 被拷贝');
console.assert(objKey !== Array.from(map.keys())[0], 'Map 对象 key 不是同一个对象');

// Set
const set = new Set([1, 2, 3, { id: 1 }]);
const clonedSet = deepClone(set);
console.assert(clonedSet instanceof Set, 'Set 类型保持');
console.assert(clonedSet.has(1), 'Set 基本值正确');
console.assert(clonedSet !== set, 'Set 不是同一个对象');
console.assert(clonedSet.size === 4, 'Set 大小正确');

// 函数引用相同（不拷贝）
const fn = function() { return 1; };
const objWithFn = { fn };
const clonedObjWithFn = deepClone(objWithFn);
console.assert(clonedObjWithFn.fn === fn, '函数直接返回引用，不拷贝');

// Symbol 属性
const sym = Symbol('test');
const obj4 = { [sym]: 'symValue', normal: 1 };
const c4 = deepClone(obj4);
console.assert(c4[sym] === 'symValue', 'Symbol 属性被拷贝');
console.assert(c4.normal === 1, '普通属性被拷贝');
console.assert(c4 !== obj4, '不是同一个对象');

// Error 对象
const err = new Error('something went wrong');
const clonedErr = deepClone(err);
console.assert(clonedErr.message === 'something went wrong', 'Error message 正确');
console.assert(clonedErr instanceof Error, 'Error 类型保持');
console.assert(clonedErr !== err, 'Error 不是同一个对象');

// Error 子类
const typeErr = new TypeError('type error');
const clonedTypeErr = deepClone(typeErr);
console.assert(clonedTypeErr instanceof TypeError, 'TypeError 子类保持');
console.assert(clonedTypeErr.message === 'type error', 'TypeError message 正确');

// 空对象 & 空数组
console.assert(JSON.stringify(deepClone({})) === '{}', '空对象');
console.assert(JSON.stringify(deepClone([])) === '[]', '空数组');

// 数组深拷贝
const arr = [1, [2, 3], { a: 4 }];
const clonedArr = deepClone(arr);
clonedArr[1].push(99);
console.assert(arr[1].length === 2, '数组深拷贝，修改副本不影响原对象');
console.assert(clonedArr[0] === 1, '数组基本值正确');

// 原型链保留
class MyClass {
  constructor(x) { this.x = x; }
  getX() { return this.x; }
}
const instance = new MyClass(42);
const clonedInstance = deepClone(instance);
console.assert(clonedInstance instanceof MyClass, '原型链保留');
console.assert(clonedInstance.x === 42, '实例属性正确');
console.assert(typeof clonedInstance.getX === 'function', '原型方法可访问');

console.log('✅ 全部通过');
