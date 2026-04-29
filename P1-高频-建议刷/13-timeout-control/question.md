> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# 13 - 超时控制器（Promise 超时）

## 基本信息

- **分类**：异步与并发控制
- **难度**：⭐⭐⭐
- **考察点**：Promise.race、AbortController、超时取消

---

## 背景

`fetch()` 没有内置超时机制。如果服务端无响应，Promise 会一直 pending，用户无限等待。我们需要一个通用的超时控制器，在指定时间内未响应时自动取消请求并抛出错误。

---

## 题目要求

### 1. 实现 `withTimeout(promise, ms)`

封装任意 Promise，使其在 `ms` 毫秒后若未 resolve/reject，则自动 reject。

```javascript
withTimeout(fetch('/api/data'), 3000)
  .then(res => res.json())
  .catch(err => console.error(err)); // 3 秒后若无响应，reject with TimeoutError
```

- 返回一个新 Promise，原 Promise 在 `ms` 内完成则正常传递结果
- 超时则 reject 一个 Error
- 超时后清除定时器，避免内存泄漏
- `ms` 必须为正数，传入 0 或负数时直接 reject

### 2. 实现 `fetchWithTimeout(url, options, timeout)`

带超时控制的 fetch 请求，超时后通过 `AbortController` 真正取消底层 HTTP 请求。

```javascript
fetchWithTimeout('/api/user', { method: 'GET' }, 3000)
  .then(res => res.json())
  .catch(err => {
    if (err.name === 'TimeoutError') {
      console.log('请求超时被取消');
    }
  });
```

- 内部使用 `AbortController` 实现请求取消
- 超时后自动调用 `controller.abort()` 取消底层 HTTP 请求
- 将 signal 传入 fetch 的 options

---

## 约束条件

1. **`fetchWithTimeout` 必须使用 `AbortController`**：超时后要真正取消底层 HTTP 请求
2. **内存安全**：Promise 完成或超时后必须清除 `setTimeout`
3. **错误语义清晰**：超时错误应能与网络错误、abort 错误区分
4. **不使用第三方库**：纯原生实现

---

## 进阶思考（可选）

1. 如何实现可复用的 `AbortController` 管理器，支持手动取消和超时取消？
2. 如何设计「超时后自动重试 2 次」的组合方案？
3. `Promise.race` 的"孤儿 Promise"问题：超时后原 Promise 仍在执行，如何真正中断？