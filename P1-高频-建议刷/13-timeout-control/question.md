> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# 13 - 超时控制器（Promise 超时）

## 基本信息

- **分类**：异步与并发控制
- **难度**：⭐⭐⭐
- **考察点**：Promise.race、AbortController、超时取消

---

## 背景

在前端开发中，接口请求如果没有超时控制，用户可能会无限等待。尤其在以下场景中，超时控制至关重要：

- **文件上传/下载**：大文件传输可能因网络波动长时间无响应
- **登录/注册**：用户期望快速得到反馈，不应超过 3-5 秒
- **数据查询接口**：复杂查询可能因服务端负载高而延迟
- **第三方 API 调用**：外部服务不可控，必须有兜底机制

我们需要一个通用的超时控制器，能够在指定时间内未得到响应时自动取消请求并抛出错误。

---

## 题目要求

### 1. 实现 `withTimeout(promise, ms)`

封装任意 Promise，使其在 `ms` 毫秒后若未 resolve/reject，则自动 reject。

```js
// 示例
withTimeout(fetch('/api/data'), 3000)
  .then(res => res.json())
  .catch(err => console.error(err)); // 3 秒后若无响应，reject with TimeoutError
```

**要求**：
- 返回一个新的 Promise
- 若原 Promise 在 `ms` 内完成，正常传递结果
- 若超时，reject 一个带有 `'Timeout'` 消息的 Error
- 超时后应能清理定时器，避免内存泄漏
- `ms` 必须为正数，传入 0 或负数时应直接 reject

### 2. 实现 `fetchWithTimeout(url, options, timeout)`

基于 `withTimeout` 封装一个带超时控制的 fetch 请求。

```js
// 示例
fetchWithTimeout('/api/user', { method: 'GET' }, 3000)
  .then(res => res.json())
  .catch(err => {
    if (err.name === 'TimeoutError') {
      console.log('请求超时被取消');
    }
  });
```

**要求**：
- 内部使用 `AbortController` 实现请求取消
- 超时后自动调用 `controller.abort()` 取消底层 HTTP 请求
- 正常完成时清除超时定时器
- 将 AbortController 的 signal 传入 fetch 的 options

---

## 约束条件

1. **`fetchWithTimeout` 必须使用 `AbortController`**：超时后要真正取消底层的 HTTP 请求，而非仅在 Promise 层面 reject
2. **内存安全**：必须在 Promise 完成或超时后清除 `setTimeout`，防止内存泄漏
3. **错误语义清晰**：超时错误应能与网络错误、abort 错误区分
4. **不使用第三方库**：纯原生实现

---

## 进阶思考（可选）

1. 如何实现一个可复用的 `AbortController` 管理器，支持手动取消和超时取消？
2. 如果需要支持「重试 + 超时」组合（如：超时后自动重试 2 次），如何设计？
3. `Promise.race` 有一个已知问题：超时后原 Promise 仍在执行，如何真正中断它？
