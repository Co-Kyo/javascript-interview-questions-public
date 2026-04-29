# 03 防抖 debounce & 节流 throttle - 五步讲解

---

## 第一步：理解问题 — 为什么需要防抖和节流？

### 问题根源：高频事件

浏览器中许多事件触发频率极高：

```
用户输入 "hello"
├─ input 事件触发: "h" → "he" → "hel" → "hell" → "hello"
├─ 每次触发都发请求: /api/search?q=h, /api/search?q=he, ...
└─ 5 次输入 = 5 次网络请求，其中 4 次是无用的
```

```
用户滚动页面
├─ scroll 事件: 每帧(~16ms) 触发一次
├─ 1 秒 = ~60 次触发
└─ 每次都做 DOM 计算 → 页面卡顿
```

### 核心需求

**我们不需要每一次触发都执行，只需要在合适的时间点执行。**

---

## 第二步：核心思路 — 防抖 vs 节流的区别

### 防抖 debounce：等待"安静"下来

> **电梯关门比喻**：人不断进来，门就一直不关。只有没人进来后等一会儿，门才关上。

```
事件: ─x─x─x─x────────────x────────────────
执行: ─────────────────────●───────────────── (最后一次后等 delay 才执行)
      ↑ 连续触发，全部忽略   ↑ 最后一次触发，delay 后执行
```

- **策略**：每次触发时重置定时器，只在"停止触发"后 `delay` 毫秒才执行
- **适用**：搜索输入、窗口 resize（关心最终结果，不关心中间过程）

### 节流 throttle：固定频率执行

> **水龙头比喻**：拧开后，水滴按固定间隔滴落，不会因为你拧快了就滴更快。

```
事件: ─x─x─x─x─x─x─x─x─x─x─x─x─x─x─x─x─x─
执行: ─●───────●───────●───────●───────●─────
      ↑ 每隔 interval 执行一次，不管中间触发多少次
```

- **策略**：在固定时间窗口（`interval`）内，最多执行一次
- **适用**：滚动监听、拖拽、射击游戏（按固定频率响应）

### 一句话总结

| | 防抖 debounce | 节流 throttle |
|---|---|---|
| 比喻 | 电梯关门 | 水龙头滴水 |
| 策略 | 最后一次触发后等待 | 固定频率执行 |
| 关注点 | 停止操作后的结果 | 操作过程中的均匀响应 |

---

## 第三步：逐步实现

### 3.1 debounce 基础版（仅 trailing）

最简单的防抖：用 `clearTimeout` 重置定时器。

```javascript
function debounce(fn, delay) {
  let timerId = null;

  return function (...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}
```

闭包保存 `timerId`。`clearTimeout` 是防抖的核心 — 取消上一次还没执行的调用。`fn.apply(this, args)` 保证 `this` 和参数正确传递。

### 3.2 debounce 加入 leading 选项

`leading: true` 表示第一次触发立即执行，后续在 `delay` 内的调用被忽略。

```javascript
function debounce(fn, delay, options = {}) {
  const { leading = false, trailing = true } = options;
  let timerId = null;
  let lastCallTime = 0;

  return function (...args) {
    const now = Date.now();
    clearTimeout(timerId);

    if (leading && lastCallTime === 0) {
      fn.apply(this, args);
      lastCallTime = now;
    }

    timerId = setTimeout(() => {
      if (trailing && lastCallTime > 0) {
        fn.apply(this, args);
      }
      lastCallTime = 0;
    }, delay);
  };
}
```

`lastCallTime` 为 0 表示从未调用过，此时 `leading` 生效立即执行。定时器到期后重置为 0，允许下次再次 leading。

> **注意**：此简化版使用 `lastCallTime` 时间戳判断是否首次调用，与 `solution.js` 的完整版思路一致。完整版使用独立的 `leadingEdge()` / `trailingEdge()` 函数拆分逻辑，结构更清晰。

### 3.3 throttle 基础版（时间戳实现）

```javascript
function throttle(fn, interval) {
  let previous = 0;

  return function (...args) {
    const now = Date.now();
    if (now - previous >= interval) {
      fn.apply(this, args);
      previous = now;
    }
  };
}
```

第一次一定执行（`previous=0` 时 `now - 0 >= interval` 恒成立），最后一次可能不执行。

### 3.4 throttle 加入 trailing（定时器版）

```javascript
function throttle(fn, interval) {
  let timerId = null;
  let previous = 0;

  return function (...args) {
    const now = Date.now();
    const remaining = interval - (now - previous);

    if (remaining <= 0) {
      clearTimeout(timerId);
      timerId = null;
      fn.apply(this, args);
      previous = now;
    } else if (timerId === null) {
      timerId = setTimeout(() => {
        fn.apply(this, args);
        previous = Date.now();
        timerId = null;
      }, remaining);
    }
  };
}
```

当 `remaining <= 0` 时到时间了立即执行；否则设置 trailing 定时器，在剩余时间后补执行。

### 3.5 完整实现（推荐用于面试回答）

最终版需要处理：`leading` / `trailing` 各种组合、`cancel()` 方法、`this` 和参数传递、时间戳逻辑。

> 完整代码见 `solution.js`

---

## 第四步：常见变体

### 变体 1：立即返回 Promise 的 debounce

```javascript
function debounceAsync(fn, delay) {
  let timerId = null;
  let resolveList = [];
  let rejectList = [];

  return function (...args) {
    clearTimeout(timerId);

    return new Promise((resolve, reject) => {
      resolveList.push(resolve);
      rejectList.push(reject);

      timerId = setTimeout(async () => {
        try {
          const result = await fn.apply(this, args);
          resolveList.forEach(r => r(result));
        } catch (err) {
          rejectList.forEach(r => r(err));
        } finally {
          resolveList = [];
          rejectList = [];
        }
      }, delay);
    });
  };
}
```

### 变体 2：React Hook 中的 debounce

```javascript
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

### 变体 3：requestAnimationFrame 节流

用 `rAF` 替代 `setTimeout`，天然与浏览器渲染帧同步：

```javascript
function rafThrottle(fn) {
  let ticking = false;

  return function (...args) {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        fn.apply(this, args);
        ticking = false;
      });
    }
  };
}
```

---

## 第五步：易错点

### ❌ 易错点 1：忘记用闭包保存定时器 ID

```javascript
function debounce(fn, delay) {
  return function (...args) {
    let timerId = null;
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), delay);
  };
}
```

> ⚠️ `timerId` 在函数体内每次调用都重新声明，无法清除上一个定时器。必须用闭包保存。

`timerId` 必须在闭包中保存，才能在下次调用时清除上一个定时器。

### ❌ 易错点 2：忘记传递 this 和 arguments

```javascript
return function (...args) {
  clearTimeout(timerId);
  timerId = setTimeout(() => {
    fn.apply(this, args);
  }, delay);
};
```

> ⚠️ 如果返回的函数用箭头函数声明，`this` 不会指向调用者，`apply` 传递的 `this` 会出错。

返回的函数必须用 `function` 声明（不能用箭头函数），才能通过 `apply` 正确传递 `this`。

### ❌ 易错点 3：leading + trailing 同时开启时重复执行

当 `leading: true, trailing: true` 时，如果 `delay` 内只触发了一次，会执行两次（leading 一次 + trailing 一次）。

lodash 的 debounce 在 `leading: true, trailing: true` 下，仅调用一次时只执行 leading（不执行 trailing）。trailing 仅在 delay 内有多次调用时才会触发。这是面试中常被追问的细节。

### ❌ 易错点 4：throttle 中 leading: false 时首次不执行

```javascript
if (previous === 0 && !leading) {
  previous = now;
}
```

> ⚠️ 当 `leading: false` 时，`previous = 0` 会导致 `now - 0 >= interval` 恒成立，首次会意外执行。必须先设置时间戳跳过首次。


当 `leading: false` 时，`previous = 0` 会导致 `now - 0 >= interval` 恒成立，必须先设置时间戳。

### ❌ 易错点 5：忘记实现 cancel() 方法

实际业务中，组件卸载时必须取消挂起的 debounce/throttle，否则会执行已卸载组件的回调，导致内存泄漏或报错。

### ❌ 易错点 6：混淆防抖和节流的使用场景

| 场景 | 应该用 | 原因 |
|------|--------|------|
| 搜索框输入 | debounce | 只关心最终输入结果 |
| 滚动加载 | throttle | 需要定期检查位置 |
| 窗口 resize | debounce | 只关心最终尺寸 |
| 拖拽移动 | throttle | 需要平滑响应每个位置 |
| 按钮防重复点击 | debounce/throttle | 两者都可以，看需求 |
