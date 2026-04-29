# 13 - 超时控制器 · 五步讲解

---

## 第一步：理解核心问题

**为什么需要超时控制？**

`fetch()` 本身没有内置超时机制。如果服务端无响应或网络卡住，Promise 会一直处于 pending 状态：

```js
// ❌ 没有超时控制：用户可能永远等下去
fetch('/api/data').then(res => res.json()).then(renderUI);
// 如果服务端挂了，renderUI 永远不会执行
```

这在实际项目中是不可接受的——用户会看到无限转圈的 loading。

**核心思路**：用一个「超时 Promise」和原始 Promise 竞争，谁先完成就用谁的结果。这就是 `Promise.race` 的经典应用场景。

---

## 第二步：实现 withTimeout（纯 Promise 层面）

最简单的超时封装——只在 Promise 层面做竞争，不涉及底层请求取消：

```js
function withTimeout(promise, ms) {
  // 参数校验：ms 必须为正数
  if (typeof ms !== 'number' || ms <= 0) {
    return Promise.reject(new Error('Timeout ms must be a positive number'));
  }

  const timeoutPromise = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout: 超过 ${ms}ms`));
    }, ms);
    // 清理定时器，防止内存泄漏
    promise.finally(() => clearTimeout(timer));
  });
  return Promise.race([promise, timeoutPromise]);
}
```

**关键细节**：

1. `Promise.race` 取**第一个** settled（完成或拒绝）的结果
2. 必须在原 Promise 完成后 `clearTimeout`，否则定时器会持续占用内存
3. 超时 Promise 的 reject 不会阻止原 Promise 继续执行——这是个坑，第三步解决
4. `ms` 参数应为正数，传入 0 或负数时直接 reject

**局限**：超时后 fetch 请求仍在后台运行，浪费带宽和服务器资源。

---

## 第三步：引入 AbortController（真正取消请求）

`AbortController` 是浏览器提供的请求取消 API，超时后可以**真正中断**底层 HTTP 连接：

```js
const controller = new AbortController();

fetch('/api/data', { signal: controller.signal });

// 手动取消 → 底层 TCP 连接被关闭，fetch reject 一个 AbortError
controller.abort();
```

结合超时逻辑：

```js
function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const fetchPromise = fetch(url, { ...options, signal: controller.signal });

  const timeoutPromise = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      controller.abort(); // ← 关键：超时后真正取消请求
      const err = new Error(`Timeout: 超过 ${timeout}ms`);
      err.name = 'TimeoutError'; // 明确错误类型，便于 catch 中区分
      reject(err);
    }, timeout);
    fetchPromise.finally(() => clearTimeout(timer));
  });

  return Promise.race([fetchPromise, timeoutPromise]);
}
```

**为什么这比纯 `withTimeout` 更好？**

| | withTimeout | fetchWithTimeout |
|---|---|---|
| 超时后请求状态 | 仍在运行 | 已中断 |
| 带宽消耗 | 继续消耗 | 立即释放 |
| 服务端压力 | 仍在处理 | 连接已断开 |

---

## 第四步：错误处理与边界情况

实际使用中需要区分不同类型的错误：

```js
fetchWithTimeout('/api/user', {}, 3000)
  .then(res => res.json())
  .catch(err => {
    if (err.name === 'TimeoutError') {
      // 超时错误（我们的自定义错误，err.name 已设置为 'TimeoutError'）
      showToast('请求超时，请重试');
    } else if (err.name === 'AbortError') {
      // 被手动取消的请求（非超时触发）
      showToast('请求已取消');
    } else {
      // 网络错误、4xx/5xx 等
      showToast('网络异常');
    }
  });
```

**错误类型区分**：
- `err.name === 'TimeoutError'`：超时触发的错误（我们手动设置 `err.name`）
- `err.name === 'AbortError'`：`controller.abort()` 导致 fetch 产生的原生错误
- 其他：网络错误、HTTP 错误等

**注意**：`abort()` 调用后 fetch 会 reject 一个 `AbortError`，但我们的 `timeoutPromise` 也会 reject。由于 `Promise.race` 只取第一个 settled 的结果，后到的 reject 会被忽略——这正是我们想要的。超时场景下，用户 catch 到的是我们自定义的 `TimeoutError`（带有 `err.name = 'TimeoutError'`），而非 `AbortError`。

**定时器清理**：无论成功、失败还是超时，`finally(() => clearTimeout(timer))` 确保定时器不会泄漏。这是面试中常被追问的点。

---

## 第五步：进阶思考与实际应用

### 问题：超时后原 Promise 仍在执行

`Promise.race` 只是"忽略"了慢的那个 Promise，但原 Promise 并不会被取消（除非用了 AbortController）。对于非 fetch 的 Promise（如定时器、计算任务），需要额外的取消机制：

```js
// 用 AbortSignal 传递取消信号（现代模式）
function withAbortableTimeout(promiseFn, ms) {
  const controller = new AbortController();
  const { signal } = controller;

  const promise = promiseFn(signal); // 传入 signal，让业务代码监听取消
  const timeoutPromise = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Timeout'));
    }, ms);
    promise.finally(() => clearTimeout(timer));
  });

  return Promise.race([promise, timeoutPromise]);
}
```

### 实际应用场景

1. **全局请求拦截器**：在 axios/fetch 拦截器中统一设置超时
2. **竞态请求**：同时请求多个 CDN 节点，取最快响应（`Promise.race` 的变体）
3. **登录防抖**：登录接口超时 3 秒，防止用户重复点击
4. **SSR 数据预取**：服务端渲染时，数据请求超时则降级为客户端渲染

### 面试加分点

- 能说清 `AbortController` 的工作原理和浏览器兼容性
- 知道 `Promise.race` 的"孤儿 Promise"问题
- 能设计 `RetryController`（重试 + 超时 + 取消）组合方案
- 了解 axios 的 `timeout` 选项底层也是类似实现
