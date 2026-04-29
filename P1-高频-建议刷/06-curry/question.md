> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# 06 - 柯里化 Curry

## 基本信息

- **分类**：JavaScript 核心手写
- **难度**：⭐⭐
- **考察点**：闭包、递归、参数收集、函数式编程

---

## 题目描述

实现一个通用的柯里化（currying）函数 `curry(fn)`，它可以将一个接受多个参数的函数转换为一系列接受单个（或多个）参数的函数调用。

### 核心要求

1. 实现 `curry(fn)` 函数，接收一个待柯里化的函数 `fn`
2. 支持分批传入参数，每次调用返回一个新函数继续收集参数
3. 当收集到的参数数量 **达到或超过** `fn` 所需参数数量时，自动执行原函数并返回结果
4. 使用 `Function.length` 获取函数的形参数量

### 背景与应用场景

柯里化是函数式编程的核心概念之一，在实际开发中有广泛应用：

- **React Hooks**：`useCallback`、自定义 hook 中的参数预设
- **中间件组合**：Redux middleware、Koa 中间件的链式调用
- **事件处理**：预绑定部分参数的事件回调
- **日志/配置**：创建预配置的工具函数（如特定级别的 logger）

### 示例

```javascript
// 基础示例：三参数加法
function add(a, b, c) {
  return a + b + c;
}

const curriedAdd = curry(add);

// 逐个传参
curriedAdd(1)(2)(3);    // => 6

// 混合传参
curriedAdd(1, 2)(3);    // => 6
curriedAdd(1)(2, 3);    // => 6
curriedAdd(1, 2, 3);    // => 6

// 两个参数的函数
function multiply(a, b) {
  return a * b;
}

const curriedMultiply = curry(multiply);
curriedMultiply(2)(3);  // => 6
curriedMultiply(2, 3);  // => 6
```

### 边界用例

```javascript
// 多余参数：超过形参数量的参数被忽略
curriedAdd(1, 2, 3, 4, 5);  // => 6（只取前 3 个）

// 零参数函数：fn.length === 0 时直接执行
const getNow = () => Date.now();
curry(getNow)();             // => 当前时间戳

// this 上下文：柯里化后保持调用时的 this
const obj = {
  base: 10,
  add(a, b) { return this.base + a + b; }
};
const curriedObjAdd = curry(obj.add);
curriedObjAdd.call(obj, 5)(3);  // => 18
```

### 约束条件

- 必须使用 `Function.length` 获取原函数的形参数量
- 不使用任何第三方库（如 Lodash）
- 支持任意参数数量的函数（包括 0 个参数）
- 收集的参数超过形参数数时，多余的参数应被忽略
- 应保持 `this` 上下文正确传递

---

## 思考提示

在动手实现之前，思考以下问题：

1. `curry(fn)` 返回的是什么？它和 `fn` 有什么关系？
2. 每次调用返回的函数，如何「记住」之前传入的参数？
3. 什么时候停止收集参数并执行原函数？
4. 如何处理参数数量超过原函数形参数数的情况？
5. 如何处理 `fn.length === 0` 的零参数函数？

---

## 评分标准

| 等级 | 要求 |
|------|------|
| 及格 | 实现基本的逐个传参：`curry(add)(1)(2)(3)` |
| 良好 | 支持混合传参：`curry(add)(1, 2)(3)` |
| 优秀 | 代码简洁优雅，处理边界情况（多余参数、零参数、this），理解闭包与递归原理 |
