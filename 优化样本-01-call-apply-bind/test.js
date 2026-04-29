/**
 * 手写 call / apply / bind — 测试
 * 运行：node test.js
 */

require('./solution.js');

function greet(greeting, punctuation) {
  return `${greeting}, ${this.name}${punctuation}`;
}
const person = { name: 'Alice' };

// myCall
console.assert(greet.myCall(person, 'Hello', '!') === 'Hello, Alice!', 'myCall 基本功能');

// myApply
console.assert(greet.myApply(person, ['Hi', '~']) === 'Hi, Alice~', 'myApply 基本功能');

// myBind 部分应用
const boundGreet = greet.myBind(person, 'Hey');
console.assert(boundGreet('?') === 'Hey, Alice?', 'myBind 部分应用');

// myBind + new
function Person(name, age) {
  this.name = name;
  this.age = age;
}
const BoundPerson = Person.myBind(null, 'Bob');
const p = new BoundPerson(25);
console.assert(p.name === 'Bob', 'myBind + new: name');
console.assert(p.age === 25, 'myBind + new: age');
console.assert(p instanceof Person, 'myBind + new: instanceof');

// null thisArg → globalThis
function getThis() { return this; }
console.assert(getThis.myCall(null) === globalThis, 'null thisArg 回退到 globalThis');

// 原始值 thisArg
function getType() { return typeof this; }
console.assert(getType.myCall(42) === 'object', '原始值 thisArg 包装为对象');

// myApply 非数组参数应抛 TypeError
try {
  greet.myApply(person, 'not-array');
  console.assert(false, 'myApply 非数组应抛 TypeError');
} catch (e) {
  console.assert(e instanceof TypeError, 'myApply 非数组抛 TypeError');
}

// myApply 空数组
function noArgs() { return 'ok'; }
console.assert(noArgs.myApply(null, []) === 'ok', 'myApply 空数组');

// bound.name
console.assert(Person.myBind({}).name === 'bound Person', 'bound.name 带前缀');

console.log('✅ 全部通过');
