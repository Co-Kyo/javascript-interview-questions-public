> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 03 防抖 debounce & 节流 throttle

> 分类：JavaScript 核心手写 | 难度：⭐⭐ | 考察点：闭包、定时器、时间戳、高频事件优化

## 背景

在前端开发中，搜索框输入、滚动监听、窗口 resize、按钮防重复点击等场景会产生高频事件。如果不加以控制，会导致大量重复请求、频繁 DOM 操作和非预期行为。防抖和节流是解决这类问题的两种经典策略。

## 题目要求

### 1. 实现 `debounce(fn, delay, options)`

- `options.leading`（默认 `false`）：是否在延迟开始前立即执行
- `options.trailing`（默认 `true`）：是否在延迟结束后执行
- 返回的函数必须有 `cancel()` 方法

### 2. 实现 `throttle(fn, interval, options)`

- `options.leading`（默认 `true`）：是否在节流开始时立即执行
- `options.trailing`（默认 `true`）：是否在节流结束后补执行最后一次
- 返回的函数必须有 `cancel()` 方法

## 示例

```javascript
// 防抖：连续调用只执行最后一次
let count = 0;
const debounced = debounce(() => { count++; }, 200);
debounced(); debounced(); debounced();
// 200ms 后 count === 1

// 节流：固定频率执行
let count2 = 0;
const throttled = throttle(() => { count2++; }, 300);
throttled(); throttled(); throttled();
// 立即执行一次 (leading)，300ms 后补执行一次 (trailing) → count2 === 2
```

## 约束

1. 纯 JavaScript 实现，不依赖 lodash 等第三方库
2. 必须使用闭包管理内部状态
3. `this` 上下文和参数必须正确传递
4. 考虑 `leading` 和 `trailing` 各种组合的边界情况
