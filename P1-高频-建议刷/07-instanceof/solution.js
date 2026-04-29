/**
 * 手写 instanceof
 *
 * 核心原理：沿 left 的原型链逐级向上查找，看是否能找到 right.prototype
 * 即判断 right.prototype 是否在 left 的原型链上
 *
 * @param {*} left  - 待检测的实例
 * @param {*} right - 构造函数
 * @returns {boolean}
 */
function myInstanceof(left, right) {
  // 边界处理：right 必须是函数（有 prototype 属性）
  if (typeof right !== 'function') {
    throw new TypeError('Right-hand side of instanceof is not callable');
  }

  // 优先检查 Symbol.hasInstance（ES6 自定义 instanceof 行为）
  // 注意：即使 left 是基本类型，Symbol.hasInstance 也可以自定义行为
  // 如：class EvenNumber { static [Symbol.hasInstance](v) { return v % 2 === 0; } }
  // 4 instanceof EvenNumber → true
  if (right[Symbol.hasInstance] !== Function.prototype[Symbol.hasInstance]) {
    return right[Symbol.hasInstance](left);
  }

  // 边界处理：基本类型（number/string/boolean/symbol/bigint）直接返回 false
  // 原生 instanceof 对基本类型也返回 false：123 instanceof Number === false
  if (left === null || left === undefined) return false;
  if (typeof left !== 'object' && typeof left !== 'function') return false;

  // 获取 left 的原型（等价于 Object.getPrototypeOf(left)）
  let proto = Object.getPrototypeOf(left);

  // 获取 right 的 prototype 属性
  const prototype = right.prototype;

  // 沿原型链逐级向上遍历
  while (proto !== null) {
    // 找到了匹配的 prototype，说明 left 是 right 的实例
    if (proto === prototype) {
      return true;
    }
    // 继续沿原型链上溯
    proto = Object.getPrototypeOf(proto);
  }

  // 遍历到原型链顶端（null）仍未找到，返回 false
  return false;
}

// ==================== 测试用例 ====================

// 基本类型 → false
console.log(myInstanceof(123, Number));       // false
console.log(myInstanceof('hello', String));   // false
console.log(myInstanceof(true, Boolean));     // false
console.log(myInstanceof(42n, BigInt));        // false
console.log(myInstanceof(Symbol('s'), Symbol));// false

// null / undefined → false
console.log(myInstanceof(null, Object));      // false
console.log(myInstanceof(undefined, Object)); // false

// 引用类型 → true
console.log(myInstanceof([], Array));          // true
console.log(myInstanceof({}, Object));         // true
console.log(myInstanceof(new Date(), Date));   // true
console.log(myInstanceof(/abc/, RegExp));      // true

// ES6 class
class Animal {}
class Dog extends Animal {}
console.log(myInstanceof(new Dog(), Dog));     // true
console.log(myInstanceof(new Dog(), Animal));  // true
console.log(myInstanceof(new Dog(), Object));  // true
console.log(myInstanceof(new Animal(), Dog));  // false

// 函数类型
console.log(myInstanceof(()=>{}, Function));   // true
console.log(myInstanceof(function(){}, Function)); // true

// 原型链继承
function Foo() {}
function Bar() {}
Bar.prototype = Object.create(Foo.prototype);
console.log(myInstanceof(new Bar(), Foo));     // true
console.log(myInstanceof(new Bar(), Bar));     // true
console.log(myInstanceof(new Bar(), Object));  // true
console.log(myInstanceof(new Foo(), Bar));     // false

// right 类型校验
try {
  myInstanceof({}, 'not a function');
  console.log('ERROR: should have thrown');
} catch (e) {
  console.log('right type check passed:', e.message); // TypeError
}

// Symbol.hasInstance 自定义
class EvenNumber {
  static [Symbol.hasInstance](value) {
    return typeof value === 'number' && value % 2 === 0;
  }
}
console.log(myInstanceof(4, EvenNumber));      // true
console.log(myInstanceof(3, EvenNumber));      // false

module.exports = myInstanceof;
