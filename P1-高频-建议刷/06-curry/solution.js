/**
 * 柯里化 (Currying) 实现
 *
 * 将一个多参数函数转换为一系列单参数/多参数调用
 * 当收集的参数达到原函数所需数量时自动执行
 *
 * 复杂度分析：
 *   时间：O(k) — k 为调用次数（每次调用合并参数）
 *   空间：O(k) — 每次调用闭包捕获当前参数数组
 */

/**
 * 核心实现：curry 函数
 * @param {Function} fn - 待柯里化的函数
 * @returns {Function} - 柯里化后的函数
 */
function curry(fn) {
  // fn.length === 0 时直接返回原函数，避免无限返回新函数
  if (fn.length === 0) return fn;

  // 通过闭包持续收集参数
  return function curried(...args) {
    // 捕获当前 this，供后续链式调用使用
    const context = this;

    // 判断已收集的参数是否满足原函数所需
    if (args.length >= fn.length) {
      // 参数够了，直接调用原函数并传入所有收集的参数
      // 多余参数由 JS 引擎自动忽略
      return fn.apply(context, args);
    }
    // 参数不够，返回一个新函数继续收集
    return function (...nextArgs) {
      // 递归调用 curried，合并已有参数和新参数
      // 使用闭包捕获的 context，保持 this 一致性
      return curried.apply(context, [...args, ...nextArgs]);
    };
  };
}

// ==================== 测试用例 ====================

// 辅助断言函数
function assert(condition, msg) {
  if (!condition) throw new Error(`❌ FAIL: ${msg}`);
  console.log(`  ✅ ${msg}`);
}

console.log('--- 基础测试 ---');

// 1. 基础测试：三参数加法
function add(a, b, c) {
  return a + b + c;
}

const curriedAdd = curry(add);

assert(curriedAdd(1)(2)(3) === 6, '逐个传参: curriedAdd(1)(2)(3) === 6');
assert(curriedAdd(1, 2)(3) === 6, '混合传参: curriedAdd(1,2)(3) === 6');
assert(curriedAdd(1)(2, 3) === 6, '混合传参: curriedAdd(1)(2,3) === 6');
assert(curriedAdd(1, 2, 3) === 6, '一次传完: curriedAdd(1,2,3) === 6');

// 2. 两个参数
function multiply(a, b) {
  return a * b;
}

const curriedMultiply = curry(multiply);

assert(curriedMultiply(2)(3) === 6, '两参数: curriedMultiply(2)(3) === 6');
assert(curriedMultiply(2, 3) === 6, '两参数一次传: curriedMultiply(2,3) === 6');

// 3. 单参数函数
function double(x) {
  return x * 2;
}

const curriedDouble = curry(double);

assert(curriedDouble(5) === 10, '单参数: curriedDouble(5) === 10');
assert(curriedDouble(5) === double(5), '单参数等价: curry 后与原函数结果一致');

// 4. 部分应用
const add10 = curriedAdd(10);
assert(add10(5)(3) === 18, '部分应用: add10(5)(3) === 18');
assert(add10(1)(2) === 13, '部分应用: add10(1)(2) === 13');

console.log('\n--- 边界测试 ---');

// 5. 多余参数：超过形参数量的参数被忽略（一次性传入时）
assert(curriedAdd(1, 2, 3, 4, 5) === 6, '多余参数: curriedAdd(1,2,3,4,5) === 6');
// 注意：curriedAdd(1)(2)(3) 已经执行返回 6，后续无法再调用 — 这是正确行为

// 6. 零参数函数
function getConstant() { return 42; }
const curriedGet = curry(getConstant);
assert(curriedGet() === 42, '零参数函数: curry(getConstant)() === 42');

// 7. this 上下文保持（通过闭包捕获 context，链式调用也能保持 this）
const obj = {
  base: 10,
  add(a, b) { return this.base + a + b; }
};
const curriedObjAdd = curry(obj.add);
assert(curriedObjAdd.call(obj, 5, 3) === 18, 'this 上下文一次传: curriedObjAdd.call(obj,5,3) === 18');
assert(curriedObjAdd.call(obj, 5)(3) === 18, 'this 上下文链式: curriedObjAdd.call(obj,5)(3) === 18');

console.log('\n🎉 所有测试通过！');
