# 06 - 柯里化 Curry 详解

## 第一步：理解问题

### 什么是柯里化？

柯里化（Currying）是一种函数转换技术：把一个接受 `n` 个参数的函数，转换为 `n` 个接受单个参数的函数链式调用。

```
// 普通函数
f(a, b, c) → result

// 柯里化后
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

### 版本 1：最简实现（只支持逐个传参）

```javascript
function curry(fn) {
  return function curried(arg) {
    // 只有一个参数时直接执行
    if (fn.length === 1) return fn(arg);
    // 否则返回新函数继续收集
    return curry(fn.bind(null, arg));
  };
}

// 问题：只支持 f(1)(2)(3)，不支持 f(1, 2)(3)
```

### 版本 2：支持多参数收集

```javascript
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      // 参数够了 → 执行
      return fn(...args);
    }
    // 参数不够 → 返回新函数继续收集
    return function (...nextArgs) {
      return curried(...args, ...nextArgs);
    };
  };
}

// ✓ 支持 f(1)(2)(3)
// ✓ 支持 f(1, 2)(3)
// ✓ 支持 f(1)(2, 3)
```

### 版本 3：完整实现（保持 this 上下文 + 零参数处理）

```javascript
function curry(fn) {
  // 零参数函数直接返回，避免无意义包装
  if (fn.length === 0) return fn;

  return function curried(...args) {
    // 用闭包捕获 this，确保链式调用保持上下文
    const context = this;

    if (args.length >= fn.length) {
      return fn.apply(context, args);
    }
    return function (...nextArgs) {
      return curried.apply(context, [...args, ...nextArgs]);
    };
  };
}

// ✓ 保持 this 上下文（链式调用也正确）
// ✓ 支持任意参数组合
// ✓ 处理边界情况（零参数、多余参数）
```

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

### 变体 1：Lodash 风格的 curry（支持占位符）

```javascript
// 使用 Symbol 作为占位符，避免与实际参数值冲突
const CURRY_PLACEHOLDER = Symbol('curry.placeholder');

function curry(fn, placeholder = CURRY_PLACEHOLDER) {
  return function curried(...args) {
    // 检查是否所有非占位符参数都已填满
    const isComplete = args.length >= fn.length &&
      args.slice(0, fn.length).every(arg => arg !== placeholder);

    if (isComplete) return fn(...args);

    return function (...nextArgs) {
      const merged = [...args];
      let nextIdx = 0;

      // 先填充占位符
      for (let i = 0; i < merged.length && nextIdx < nextArgs.length; i++) {
        if (merged[i] === placeholder) {
          merged[i] = nextArgs[nextIdx++];
        }
      }

      // 再追加剩余参数
      while (nextIdx < nextArgs.length) {
        merged.push(nextArgs[nextIdx++]);
      }

      return curried(...merged);
    };
  };
}

// 用法：curry(add)(CURRY_PLACEHOLDER, 2)(1)(3) → 6
```

> **为什么用 Symbol 而非字符串 `'_'`？** 字符串可能与实际参数值冲突（如用户真的传入 `'_'` 作为参数），Symbol 保证唯一性。

### 变体 2：自动柯里化装饰器

```javascript
function autoCurry(fn) {
  // 如果参数已经够了，直接执行
  if (fn.length <= 1) return fn;
  return curry(fn);
}

// 批量柯里化工具函数
function createUtils(obj) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, fn]) => [key, curry(fn)])
  );
}
```

### 变体 3：无限柯里化（空调用触发执行）

```javascript
function curryLoose(fn) {
  return function curried(...args) {
    // 返回新函数继续收集，用空调用 () 作为结束信号
    return function (...nextArgs) {
      if (nextArgs.length === 0) return fn(...args);
      return curried(...args, ...nextArgs);
    };
  };
}

// 用法：curryLoose(add)(1)(2)(3)() → 6
// 注意：需要空调用 () 触发执行，而非"参数不够也执行"
```

---

## 第五步：复杂度分析

| 指标 | 复杂度 | 说明 |
|------|--------|------|
| 时间 | O(k) | k 为调用次数，每次调用合并参数数组 |
| 空间 | O(k) | 每次调用闭包捕获当前参数数组 |

其中 k ≤ n（n 为原函数形参数量），实际使用中 k 通常很小，性能不是问题。

---

## 第六步：易错点

### ❌ 易错点 1：忘记 `...args` 收集参数

```javascript
// 错误：用单个变量存参数，无法处理多参数传入
function curry(fn) {
  let args = [];       // ← 这样每次调用都会重置
  return function (arg) {
    args.push(arg);
    if (args.length >= fn.length) return fn(...args);
    return this;       // ← 返回 this 而非新函数
  };
}
```

**正确做法**：用 `...args` 作为函数参数，利用递归天然传递。

### ❌ 易错点 2：用闭包变量而非函数参数

```javascript
// 错误：闭包变量在外层共享，多次调用会互相污染
function curry(fn) {
  const collected = [];
  return function curried(...args) {
    collected.push(...args);        // ← 污染！
    if (collected.length >= fn.length) {
      const result = fn(...collected);
      collected.length = 0;         // ← 手动清空，脆弱
      return result;
    }
    return curried;
  };
}

const add1 = curry(add);
const add2 = curry(add);
add1(1)(2);
add2(10);    // ← collected 里可能是 [1, 2, 10]！
```

**正确做法**：参数通过函数参数 `...args` 传递，每次递归合并新旧参数，无共享状态。

### ❌ 易错点 3：链式调用丢失 `this` 上下文

```javascript
// 问题：返回的内部函数用 this 而非闭包捕获的 context
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);  // ← this 在链式调用时丢失
    }
    return function (...nextArgs) {
      return curried.apply(this, [...args, ...nextArgs]);  // ← this 是调用时的值
    };
  };
}
```

**正确做法**：用 `const context = this` 在 `curried` 入口捕获上下文，后续用 `context` 替代 `this`。

### ❌ 易错点 4：混淆柯里化与部分应用

```javascript
// 部分应用 (Partial Application)：固定部分参数，一次性调用
function partial(fn, ...presetArgs) {
  return function (...laterArgs) {
    return fn(...presetArgs, ...laterArgs);
  };
}

// 柯里化 (Currying)：每次调用返回新函数，直到参数够
// curry(add)(1)(2)(3)   ← 柯里化
// partial(add, 1, 2)(3) ← 部分应用
```

### ✅ 面试加分项

1. **手写时先画流程图**，展示你理解递归收集的过程
2. **主动提到闭包陷阱**（共享状态问题），展示深度理解
3. **能区分柯里化和部分应用**，说明两者的适用场景
4. **提到实际应用**：React hooks、中间件、事件绑定等
5. **能写出 Lodash 风格的占位符版本**，说明你了解高级用法
6. **主动处理 `this` 上下文**，用闭包捕获 context 而非依赖调用时的 this
7. **处理零参数函数边界**，展示对 `Function.length` 的深入理解
