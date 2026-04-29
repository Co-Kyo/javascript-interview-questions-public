# 13 - 超时控制器 · 五步讲解

---

## 第一步：理解核心问题

**为什么需要超时控制？**

`fetch()` 本身没有内置超时机制。如果服务端无响应或网络卡住，Promise 会一直处于 pending 状态：

❌ 没有超时控制：用户可能永远等下去

```
fetch('/api/data').then(res => res.json()).then(renderUI);
```

如果服务端挂了，`renderUI` 永远不会执行。

**核心思路**：用一个「超时 Promise」和原始 Promise 竞争，谁先完成就用谁的结果。这就是 `Promise.race` 的经典应用场景。

---

## 第二步：理解 Promise.race 的竞争机制

`Promise.race` 接收一个 Promise 数组，返回一个新 Promise——取**第一个** settled（resolve 或 reject）的结果：

```
Promise.race([fetchPromise, timeoutPromise])

如果 fetch 先完成 → 返回 fetch 的结果
如果 timeout 先完成 → reject TimeoutError
```

**关键特性**：race 只"采用"第一个结果，其余结果会被忽略。但被忽略的 Promise 仍在执行——这是个坑，第三步解决。

---

## 第三步：逐步实现

### 3.1 withTimeout — 通用 Promise 超时包装器

```javascript
function withTimeout(promise, ms) {
  if (typeof ms !== 'number' || ms <= 0) {
    return Promise.reject(new Error('Timeout ms must be a positive number'));
  }

  const timeoutPromise = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout: 超过 ${ms}ms`));
    }, ms);

    promise.then(() => {}, () => {}).finally(() => clearTimeout(timer));
  });

  return Promise.race([promise, timeoutPromise]);
}
```

**参数校验**：`ms` 必须为正数，传入 0 或负数时直接 reject，避免无意义的竞态。

**`timeoutPromise`**：在 `ms` 毫秒后 reject 一个 Error。这是"计时炸弹"——如果原 Promise 超时未完成，它就爆炸。

**`promise.then(() => {}, () => {}).finally(...)`**：无论原 Promise 成功还是失败，都要清除定时器，避免内存泄漏。`.then(() => {}, () => {})` 吞掉原 Promise 的 rejection，防止 Node 报 unhandled rejection 警告。

**`Promise.race([promise, timeoutPromise])`**：谁先 settled 就用谁的结果。

**局限**：超时后原 Promise 仍在后台执行（如 fetch 请求仍在进行），浪费带宽和服务器资源。

### 3.2 fetchWithTimeout — 带 AbortController 的超时 fetch

```javascript
function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const fetchOptions = { ...options, signal: controller.signal };
  const fetchPromise = fetch(url, fetchOptions);

  const timeoutPromise = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      const err = new Error(`Timeout: 请求 ${url} 超过 ${timeout}ms`);
      err.name = 'TimeoutError';
      reject(err);
    }, timeout);

    fetchPromise.finally(() => clearTimeout(timer));
  });

  return Promise.race([fetchPromise, timeoutPromise]);
}
```

**`new AbortController()`**：浏览器提供的请求取消 API。`controller.signal` 传入 fetch options，`controller.abort()` 调用时底层 TCP 连接会被关闭。

**`controller.abort()`**：超时后真正中断 HTTP 请求，释放带宽和服务器资源。abort 后 fetch 会 reject 一个 `AbortError`，但 `Promise.race` 已经采用了 `TimeoutError`，后续的 `AbortError` 会被忽略。

**`err.name = 'TimeoutError'`**：明确错误类型，便于 catch 中区分超时、手动取消和网络错误。

**与纯 withTimeout 的对比**：

| | withTimeout | fetchWithTimeout |
|---|---|---|
| 超时后请求状态 | 仍在运行 | 已中断 |
| 带宽消耗 | 继续消耗 | 立即释放 |
| 服务端压力 | 仍在处理 | 连接已断开 |

### 3.3 FetchTimeoutController — 可管理的超时控制器

```javascript
class FetchTimeoutController {
  constructor(defaultTimeout = 5000) {
    this.defaultTimeout = defaultTimeout;
    this._controller = null;
    this._pendingRequests = [];
  }

  request(url, options = {}, timeout) {
    const controller = new AbortController();
    this._controller = controller;
    this._pendingRequests.push(controller);
    const ms = timeout || this.defaultTimeout;

    const fetchPromise = fetch(url, {
      ...options,
      signal: controller.signal,
    }).finally(() => {
      const idx = this._pendingRequests.indexOf(controller);
      if (idx !== -1) this._pendingRequests.splice(idx, 1);
    });

    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        controller.abort();
        const err = new Error(`Timeout: 请求超过 ${ms}ms`);
        err.name = 'TimeoutError';
        reject(err);
      }, ms);
      fetchPromise.finally(() => clearTimeout(timer));
    });

    return Promise.race([fetchPromise, timeoutPromise]);
  }

  cancel() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
  }

  cancelAll() {
    this._pendingRequests.forEach(c => c.abort());
    this._pendingRequests = [];
    this._controller = null;
  }
}
```

**每次请求创建新的 `AbortController`**：AbortController 是一次性的，abort 后不可复用。

**`_pendingRequests` 数组**：追踪所有活跃请求，支持 `cancelAll()` 批量取消。请求完成后通过 `finally` 从列表移除，防止内存泄漏。

**`cancel()` vs `cancelAll()`**：`cancel()` 只取消最后一次 `request()` 发起的请求，`cancelAll()` 取消所有活跃请求。

---

## 第四步：错误处理与边界情况

```javascript
fetchWithTimeout('/api/user', {}, 3000)
  .then(res => res.json())
  .catch(err => {
    if (err.name === 'TimeoutError') {
      showToast('请求超时，请重试');
    } else if (err.name === 'AbortError') {
      showToast('请求已取消');
    } else {
      showToast('网络异常');
    }
  });
```

**三种错误类型**：
- `err.name === 'TimeoutError'`：超时触发（我们自定义的 Error，`err.name` 已设置为 `'TimeoutError'`）
- `err.name === 'AbortError'`：`controller.abort()` 导致的原生错误（手动取消场景）
- 其他：网络错误、HTTP 错误等
- `err.name === 'TimeoutError'`：超时触发（我们手动设置）
- `err.name === 'AbortError'`：`controller.abort()` 导致的原生错误（手动取消场景）
- 其他：网络错误、HTTP 错误等

**定时器清理**：无论成功、失败还是超时，`finally(() => clearTimeout(timer))` 确保定时器不会泄漏。这是面试中常被追问的点。

---

## 第五步：易错点与进阶

### 易错点

| 易错点 | 说明 |
|-------|------|
| 忘记清除定时器 | Promise 完成后 setTimeout 仍在运行，造成内存泄漏 |
| 超时后未 abort 请求 | 只在 Promise 层面 reject，底层 HTTP 请求仍在消耗资源 |
| AbortController 复用 | abort 后不可复用，每次请求需创建新实例 |
| 错误类型不区分 | 超时、取消、网络错误混在一起，catch 中无法区分处理 |
| 忘记传 signal 给 fetch | abort() 调用无效，请求不会被取消 |

### 进阶追问

**Q1：超时后原 Promise 仍在执行怎么办？**

`Promise.race` 只是"忽略"慢的那个 Promise，但原 Promise 并不会被取消。对于 fetch 请求，用 AbortController 真正中断；对于其他 Promise，需要传入 AbortSignal 让业务代码监听取消。

**Q2：如何实现重试 + 超时组合？**

```javascript
async function fetchWithRetry(url, options, timeout, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetchWithTimeout(url, options, timeout);
    } catch (err) {
      if (i === retries) throw err;
      if (err.name === 'TimeoutError') continue;
      throw err;
    }
  }
}
```

只有超时错误才重试（`continue` 进入下一轮循环），其他错误直接抛出，不浪费重试次数。

**Q3：实际应用场景？**

1. 全局请求拦截器：axios/fetch 拦截器中统一设置超时
2. 竞态请求：同时请求多个 CDN 节点，取最快响应
3. SSR 数据预取：服务端渲染时超时则降级为客户端渲染
4. 登录防抖：登录接口超时 3 秒，防止用户重复点击