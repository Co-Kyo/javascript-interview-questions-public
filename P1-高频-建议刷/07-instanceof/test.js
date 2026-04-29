const { myInstanceof } = require('./solution.js');

// === 基本类型 → false ===

console.assert(myInstanceof(123, Number) === false, '基本类型: 123 instanceof Number === false');
console.assert(myInstanceof('hello', String) === false, '基本类型: "hello" instanceof String === false');
console.assert(myInstanceof(true, Boolean) === false, '基本类型: true instanceof Boolean === false');
console.assert(myInstanceof(42n, BigInt) === false, '基本类型: 42n instanceof BigInt === false');
console.assert(myInstanceof(Symbol('s'), Symbol) === false, '基本类型: Symbol instanceof Symbol === false');

// === null / undefined → false ===

console.assert(myInstanceof(null, Object) === false, 'null instanceof Object === false');
console.assert(myInstanceof(undefined, Object) === false, 'undefined instanceof Object === false');

// === 引用类型 → true ===

console.assert(myInstanceof([], Array) === true, '引用类型: [] instanceof Array === true');
console.assert(myInstanceof({}, Object) === true, '引用类型: {} instanceof Object === true');
console.assert(myInstanceof(new Date(), Date) === true, '引用类型: new Date() instanceof Date === true');
console.assert(myInstanceof(/abc/, RegExp) === true, '引用类型: /abc/ instanceof RegExp === true');

// === ES6 class 继承 ===

class Animal {}
class Dog extends Animal {}

console.assert(myInstanceof(new Dog(), Dog) === true, 'ES6 class: new Dog() instanceof Dog === true');
console.assert(myInstanceof(new Dog(), Animal) === true, 'ES6 class: new Dog() instanceof Animal === true');
console.assert(myInstanceof(new Dog(), Object) === true, 'ES6 class: new Dog() instanceof Object === true');
console.assert(myInstanceof(new Animal(), Dog) === false, 'ES6 class: new Animal() instanceof Dog === false');

// === 函数类型 ===

console.assert(myInstanceof(() => {}, Function) === true, '函数: 箭头函数 instanceof Function === true');
console.assert(myInstanceof(function () {}, Function) === true, '函数: 普通函数 instanceof Function === true');

// === 原型链继承 ===

function Foo() {}
function Bar() {}
Bar.prototype = Object.create(Foo.prototype);

console.assert(myInstanceof(new Bar(), Foo) === true, '原型链继承: new Bar() instanceof Foo === true');
console.assert(myInstanceof(new Bar(), Bar) === true, '原型链继承: new Bar() instanceof Bar === true');
console.assert(myInstanceof(new Bar(), Object) === true, '原型链继承: new Bar() instanceof Object === true');
console.assert(myInstanceof(new Foo(), Bar) === false, '原型链继承: new Foo() instanceof Bar === false');

// === right 类型校验 ===

try {
  myInstanceof({}, 'not a function');
  console.assert(false, 'right 类型校验: 非函数应抛 TypeError');
} catch (e) {
  console.assert(e instanceof TypeError, 'right 类型校验: 非函数抛 TypeError');
}

// === Symbol.hasInstance 自定义 ===

class EvenNumber {
  static [Symbol.hasInstance](value) {
    return typeof value === 'number' && value % 2 === 0;
  }
}

console.assert(myInstanceof(4, EvenNumber) === true, 'Symbol.hasInstance: 4 instanceof EvenNumber === true');
console.assert(myInstanceof(3, EvenNumber) === false, 'Symbol.hasInstance: 3 instanceof EvenNumber === false');

console.log('✅ 全部通过');
