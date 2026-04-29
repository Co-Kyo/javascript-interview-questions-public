# 06 - 柯里化 Curry 详解

## 第一步：理解问题

### 什么是柯里化？

柯里化（Currying）是一种函数转换技术：把一个接受 `n` 个参数的函数，转换为 `n` 个接受单个参数的函数链式调用。

普通函数：

```
f(a, b, c) → result
```

柯里化后：

```
f(a)(b)(c) → result
```

### 核心需求拆解

| 需求 | 说明 |
|------|------|
| 输入 | 任意多参数函数 `fn` |
| 输出 | 一个可链式调用的新函数 |
| 触发条件 | 收集的参数 `>= fn.length` 时自动执行 |
| 灵活性 | 支持 `f(1)(2)(3)`、`f(1,2)(3)`、`f(1)(2,3)` 等组合 |

### 关键概念

- **`Function.length`**：函数声明时的形参个数，是判断「参数够了」的依据
- **闭包**：内部函数记住外部变量（收集的参数），是柯里化的基石
- **递归**：每次参数不够时，返回的新函数继续调用自身收集参数

---

## 第二步：核心思路

### 三步走策略

```
curry(fn) → 返回 curried 函数
  │
  ├─ fn.length === 0？→ 直接返回 fn（零参数函数特殊处理）
  │
  ├─ 参数够了？→ 直接执行 fn，返回结果
  │
  └─ 参数不够？→ 返回新函数，合并参数，递归 curried
```

### 关键设计决策

1. **用 `...args` 收集参数**：每次调用都能拿到传入的所有参数
2. **用 `fn.length` 做判断**：而非硬编码数字，保证通用性
3. **用递归而非循环**：每次返回新函数继续收集，天然适合递归结构
4. **合并参数用展开运算符**：`[...args, ...nextArgs]` 简洁直观
5. **捕获 `this` 到闭包**：用 `const context = this` 保存调用时的上下文，确保链式调用中 `this` 不丢失
6. **零参数函数短路**：`fn.length === 0` 时直接返回原函数，避免返回无意义的包装函数

---

## 第三步：逐步实现

### 3.1 最简实现（只支持逐个传参）

```javascript
function curry(fn) {
  return function curried(arg) {
    if (fn.length === 1) return fn(arg);
    return curry(fn.bind(null, arg));
  };
}
```

只支持 `f(1)(2)(3)`，不支持 `f(1, 2)(3)`。用 `fn.bind(null, arg)` 预填参数，但每次只能处理一个参数。

### 3.2 支持多参数收集

```javascript
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn(...args);
    }
    return function (...nextArgs) {
      return curried(...args, ...nextArgs);
    };
  };
}
```

用 `...args` 收集每次传入的所有参数。参数够了就执行，不够就返回新函数继续收集，合并已有参数和新参数。支持 `f(1)(2)(3)`、`f(1, 2)(3)`、`f(1)(2, 3)` 等任意组合。

### 3.3 完整实现（保持 this 上下文 + 零参数处理）

```javascript
function curry(fn) {
  if (fn.length === 0) return fn;

  return function curried(...args) {
    const context = this;

    if (args.length >= fn.length) {
      return fn.apply(context, args);
    }
    return function (...nextArgs) {
      return curried.apply(context, [...args, ...nextArgs]);
    };
  };
}
```

**`if (fn.length === 0) return fn`** — 零参数函数直接返回，避免无意义包装。

**`const context = this`** — 在 `curried` 入口捕获 `this`，后续用 `context` 替代 `this`。这确保链式调用中 `this` 不丢失：`curriedObjAdd.call(obj, 5)(3)` 中，第二次调用 `(3)` 的 `this` 不再是 `obj`，但闭包中的 `context` 仍然是。

**`fn.apply(context, args)`** — 使用 `apply` 而非 `fn(...args)`，以便正确传递 `this` 上下文。

### 执行过程演示

以 `curry(add)(1, 2)(3)` 为例：

```
第 1 次调用：curried(1, 2)
  args = [1, 2]
  context = 全局/undefined（未显式绑定）
  args.length (2) < fn.length (3)  →  参数不够
  返回新函数（闭包捕获 context 和 args=[1,2]），等待更多参数

第 2 次调用：新函数(3)
  nextArgs = [3]
  递归调用 curried.apply(context, [1, 2, 3])
  args = [1, 2, 3]
  args.length (3) >= fn.length (3)  →  参数够了
  执行 fn.apply(context, [1, 2, 3]) → 返回 6
```

---

## 第四步：常见变体

### Lodash 风格的 curry（支持占位符）

```javascript
const CURRY_PLACEHOLDER = Symbol('curry.placeholder');

function curry(fn, placeholder = CURRY_PLACEHOLDER) {
  return function curried(...args) {
    const isComplete = args.length >= fn.length &&
      args.slice(0, fn.length).every(arg => arg !== placeholder);

    if (isComplete) return fn(...args);

    return function (...nextArgs) {
      const merged = [...args];
      let nextIdx = 0;

      for (let i = 0; i < merged.length && nextIdx < nextArgs.length; i++) {
        if (merged[i] === placeholder) {
          merged[i] = nextArgs[nextIdx++];
        }
      }

      while (nextIdx < nextArgs.length) {
        merged.push(nextArgs[nextIdx++]);
      }

      return curried(...merged);
    };
  };
}
```

用 `Symbol` 而非字符串 `'_'` 作为占位符，避免与实际参数值冲突。占位符允许跳过某个参数稍后填充：`curry(add)(PLACEHOLDER, 2)(1)(3)` → `6`。

---

## 第五步：易错点

### ❌ 用闭包变量而非函数参数收集参数

```javascript
function curry(fn) {
  const collected = [];
  return function curried(...args) {
    collected.push(...args);
    if (collected.length >= fn.length) {
      const result = fn(...collected);
      collected.length = 0;
      return result;
    }
    return curried;
  };
}
```

❌ 错误原因：闭包变量 `collected` 在外层共享，多次调用会互相污染。`curry(add)` 返回的 `curried` 共享同一个 `collected` 数组。`add1(1)(2)` 后 `add2(10)` 会污染。**正确做法**：参数通过函数参数 `...args` 传递，每次递归合并新旧参数，无共享状态。

### ❌ 链式调用丢失 this 上下文

```javascript
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function (...nextArgs) {
      return curried.apply(this, [...args, ...nextArgs]);
    };
  };
}
```

❌ 错误原因：返回的内部函数用 `this` 而非闭包捕获的 `context`。第二次调用时 `this` 是调用时的值（可能是 `undefined`），而非第一次调用时的 `this`。**正确做法**：用 `const context = this` 在入口捕获。

### ❌ 混淆柯里化与部分应用

```javascript
function partial(fn, ...presetArgs) {
  return function (...laterArgs) {
    return fn(...presetArgs, ...laterArgs);
  };
}
```

上面是**部分应用（Partial Application）**：固定部分参数，一次性调用。

```javascript
curry(add)(1)(2)(3)
partial(add, 1, 2)(3)
```

柯里化是"每次一个（或多个）参数，逐步收集"；部分应用是"一次固定部分参数，返回新函数"。
