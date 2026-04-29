const { curry } = require('./solution.js');

// === 基础测试：三参数加法 ===

function add(a, b, c) {
  return a + b + c;
}
const curriedAdd = curry(add);

console.assert(curriedAdd(1)(2)(3) === 6, '逐个传参: curriedAdd(1)(2)(3) === 6');
console.assert(curriedAdd(1, 2)(3) === 6, '混合传参: curriedAdd(1,2)(3) === 6');
console.assert(curriedAdd(1)(2, 3) === 6, '混合传参: curriedAdd(1)(2,3) === 6');
console.assert(curriedAdd(1, 2, 3) === 6, '一次传完: curriedAdd(1,2,3) === 6');

// === 两个参数 ===

function multiply(a, b) {
  return a * b;
}
const curriedMultiply = curry(multiply);

console.assert(curriedMultiply(2)(3) === 6, '两参数: curriedMultiply(2)(3) === 6');
console.assert(curriedMultiply(2, 3) === 6, '两参数一次传: curriedMultiply(2,3) === 6');

// === 单参数函数 ===

function double(x) {
  return x * 2;
}
const curriedDouble = curry(double);

console.assert(curriedDouble(5) === 10, '单参数: curriedDouble(5) === 10');

// === 部分应用 ===

const add10 = curriedAdd(10);
console.assert(add10(5)(3) === 18, '部分应用: add10(5)(3) === 18');
console.assert(add10(1)(2) === 13, '部分应用: add10(1)(2) === 13');

// === 多余参数 ===

console.assert(curriedAdd(1, 2, 3, 4, 5) === 6, '多余参数: curriedAdd(1,2,3,4,5) === 6');

// === 零参数函数 ===

function getConstant() {
  return 42;
}
const curriedGet = curry(getConstant);
console.assert(curriedGet() === 42, '零参数函数: curry(getConstant)() === 42');

// === this 上下文保持 ===

const obj = {
  base: 10,
  add(a, b) {
    return this.base + a + b;
  },
};
const curriedObjAdd = curry(obj.add);
console.assert(curriedObjAdd.call(obj, 5, 3) === 18, 'this 上下文一次传: curriedObjAdd.call(obj,5,3) === 18');
console.assert(curriedObjAdd.call(obj, 5)(3) === 18, 'this 上下文链式: curriedObjAdd.call(obj,5)(3) === 18');

console.log('✅ 全部通过');
