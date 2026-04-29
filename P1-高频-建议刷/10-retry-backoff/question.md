> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# 10 - 带重试的异步请求（指数退避）

> **分类：** 异步与并发控制 &nbsp;|&nbsp; **难度：** ⭐⭐⭐
>
> **考察点：** 递归调用、setTimeout Promise 化、指数退避策略

---

## 背景

在前端开发中，网络请求经常因网络波动、服务器过载或接口限流而失败。一个健壮的请求层需要具备**自动重试**能力，同时为了避免在短时间内高频重试加剧服务端压力，还需要引入**指数退避（Exponential Backoff）** 策略。

---

## 题目要求

实现一个通用的 `retryFetch` 函数：

```javascript
/**
 * @param {Function} fn - 返回 Promise 的异步函数
 * @param {Object} options
 * @param {number} options.retries - 最大重试次数（默认 3）
 * @param {number} options.delay - 初始延迟，单位 ms（默认 1000）
 * @param {number} options.backoff - 退避因子（默认 2，即每次等待时间翻倍）
 * @param {Function} [options.onRetry] - 每次重试前的回调 (error, attempt) => void
 * @returns {Promise<any>} - 最终成功结果或抛出最后的错误
 */
function retryFetch(fn, options) { ... }
```

### 行为规则

1. **首次调用**：直接执行 `fn()`，成功则立即返回结果
2. **失败重试**：首次失败后，等待 `delay` 毫秒后重试；第 2 次失败等待 `delay × backoff`；第 3 次等待 `delay × backoff²` ……依此类推
3. **重试次数耗尽**：超过 `retries` 次重试后，抛出最后一次的错误
4. **onRetry 回调**：每次即将重试时调用 `onRetry(error, currentAttempt)`，`currentAttempt` 从 1 开始计数
5. **成功即止**：任意一次调用成功，立即返回结果，不再重试

---

## 示例

```javascript
// 第 3 次成功
let callCount = 0;
const flakyFn = () => {
  callCount++;
  if (callCount < 3) return Promise.reject(new Error(`fail #${callCount}`));
  return Promise.resolve('success!');
};

retryFetch(flakyFn, {
  retries: 3, delay: 1000, backoff: 2,
  onRetry: (err, attempt) => console.log(`第 ${attempt} 次重试，原因: ${err.message}`)
}).then(console.log);
// 第 1 次重试（等待 1s）→ 第 2 次重试（等待 2s）→ "success!"
```

---

## 约束与边界

- `fn` 必须返回 Promise
- `retries` 为 0 时，不重试，失败直接抛出
- `delay` 和 `backoff` 必须为正数
- `onRetry` 为可选参数

---

## 进阶思考（加分项）

1. 如何支持**随机抖动（Jitter）**，避免「惊群效应」？
2. 如何支持**仅对特定错误重试**（如网络超时重试，4xx 客户端错误不重试）？
3. 如何加入**AbortController** 支持，在重试等待期间可以取消？
