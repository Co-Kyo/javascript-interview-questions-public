# 33 - WebSocket 自动重连 + 心跳 - 讲解

## 第一步：理解问题

裸 `WebSocket` API 极其简单——只有四个事件回调（`onopen`、`onclose`、`onerror`、`onmessage`），**没有任何内置的重连或保活机制**。在生产环境中，连接随时可能因为网络切换、服务端重启、NAT 超时等原因断开。

需要封装一个 `ReconnectWebSocket` 类，补齐三个关键能力：**自动重连**、**心跳保活**、**消息缓存**。

---

## 第二步：核心思路

整体架构分三个模块：

1. **指数退避重连** — 重连失败后等待时间翻倍（1s → 2s → 4s → ...），避免疯狂重试
2. **心跳检测** — 定期发送 ping，超时未收到 pong 则判定连接已死，主动断开触发重连
3. **消息队列** — 断线期间 `send()` 的消息缓存到队列，连接恢复后按序发送

关键状态管理：

| 状态 | 作用 |
|------|------|
| `isManualClose` | 区分主动断开和意外断开，只有意外断开才重连 |
| `retryCount` | 记录重试次数，连接成功后归零 |
| `messageQueue` | 断线期间的消息缓存 |
| `isConnectedOnce` | 区分首次连接和重连，用于触发 `onreconnected` |

---

## 第三步：逐步实现

### 3.1 构造函数与状态初始化

```javascript
constructor(url, options = {}) {
  this.url = url;
  this.maxRetries = options.maxRetries ?? 10;
  this.heartbeatInterval = options.heartbeatInterval ?? 30000;
  this.heartbeatTimeout = options.heartbeatTimeout ?? 5000;
  this.reconnectInterval = options.reconnectInterval ?? 1000;
  this.maxReconnectInterval = options.maxReconnectInterval ?? 30000;

  this.ws = null;
  this.retryCount = 0;
  this.reconnectTimer = null;
  this.heartbeatTimer = null;
  this.pongTimer = null;
  this.isManualClose = false;
  this.messageQueue = [];
  this.maxQueueSize = options.maxQueueSize ?? 1000;
  this.isConnectedOnce = false;

  this.onopen = null;
  this.onmessage = null;
  this.onclose = null;
  this.onerror = null;
  this.onreconnecting = null;
  this.onreconnected = null;
  this.onmaxretries = null;

  this._connect();
}
```

所有配置项用 `??` 提供默认值。构造时立即发起首次连接。

### 3.2 建立连接与事件绑定

```javascript
_connect() {
  this._clearTimers();

  try {
    this.ws = new WebSocket(this.url);
  } catch (err) {
    this._scheduleReconnect();
    return;
  }

  this.ws.onopen = () => {
    const isReconnect = this.isConnectedOnce;
    this.isConnectedOnce = true;
    this.retryCount = 0;
    this.isManualClose = false;

    this._startHeartbeat();
    this._flushQueue();

    if (this.onopen) this.onopen();
    if (isReconnect && this.onreconnected) this.onreconnected();
  };
```

**`_clearTimers()`**：每次连接前清理上一次的残留定时器，防止内存泄漏。

**`isReconnect`**：在重置 `isConnectedOnce` 之前记录，用于区分首次连接和重连。只有重连时才触发 `onreconnected`。

**`retryCount = 0`**：连接成功后重置重试计数，下次断开从 1s 重新开始退避。

### 3.3 消息接收与心跳响应

```javascript
  this.ws.onmessage = (event) => {
    if (event.data === 'pong') {
      this._resetPongTimer();
      return;
    }
    if (this.onmessage) this.onmessage(event.data);
  };
```

收到 `pong` 时清除超时计时器，不传递给外部回调。普通消息交给 `onmessage`。

### 3.4 连接关闭与重连调度

```javascript
  this.ws.onclose = (event) => {
    this._clearTimers();
    if (this.onclose) this.onclose(event.code, event.reason);
    if (!this.isManualClose) {
      this._scheduleReconnect();
    }
  };
}
```

**`!this.isManualClose`**：只有非手动关闭时才触发重连。这是区分"主动断开"和"意外断开"的核心机制。

### 3.5 发送消息与队列缓存

```javascript
send(data) {
  if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    this.ws.send(data);
  } else {
    if (this.messageQueue.length >= this.maxQueueSize) {
      this.messageQueue.shift();
    }
    this.messageQueue.push(data);
  }
}
```

连接正常直接发送；否则入队缓存。队列满时丢弃最早消息，防止内存溢出。

### 3.6 指数退避重连

```javascript
_scheduleReconnect() {
  if (this.retryCount >= this.maxRetries) {
    if (this.onmaxretries) this.onmaxretries({ retryCount: this.retryCount });
    return;
  }

  const delay = Math.min(
    this.reconnectInterval * Math.pow(2, this.retryCount),
    this.maxReconnectInterval
  );

  if (this.onreconnecting) {
    this.onreconnecting({ retryCount: this.retryCount + 1, delay });
  }

  this.reconnectTimer = setTimeout(() => {
    this.retryCount++;
    this._connect();
  }, delay);
}
```

**`Math.pow(2, retryCount)`**：指数退避的核心公式。第 1 次等 1s，第 2 次等 2s，第 3 次等 4s...

**`Math.min(..., maxReconnectInterval)`**：限制上限，避免等待过久。

### 3.7 心跳检测

```javascript
_startHeartbeat() {
  this._clearHeartbeatTimers();

  this.heartbeatTimer = setInterval(() => {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send('ping');

      this.pongTimer = setTimeout(() => {
        this.ws.close();
      }, this.heartbeatTimeout);
    }
  }, this.heartbeatInterval);
}
```

每 `heartbeatInterval` 发送一次 `ping`，同时启动 `heartbeatTimeout` 超时计时器。超时未收到 `pong` 则主动 `close()`，触发 `onclose` → 自动重连。

收到 `pong` 时通过 `_resetPongTimer()` 清除超时计时器。

### 3.8 手动关闭

```javascript
close() {
  this.isManualClose = true;
  this._clearTimers();
  if (this.ws) {
    this.ws.close();
  }
}
```

设置 `isManualClose = true`，这样 `onclose` 中不会触发重连。

---

## 第四步：常见追问

### Q1：为什么用指数退避而不是固定间隔？

固定间隔在网络未恢复时会产生大量无效请求（惊群效应）。指数退避让重试频率逐渐降低，给网络恢复留出时间。

### Q2：心跳消息格式需要和服务端约定吗？

是的。本题简化为文本 `"ping"` / `"pong"`，实际项目中可能是 JSON、二进制帧或 WebSocket 协议层的 Ping/Pong 帧。

### Q3：如何处理 WebSocket 构造函数抛异常？

URL 格式错误等极端情况用 `try/catch` 包裹，捕获后走重连逻辑。

### Q4：多标签页场景下如何避免重复连接？

可以用 `BroadcastChannel` 或 `localStorage` 事件协调，同一时间只有一个标签页持有连接。

---

## 第五步：易错点

| 易错点 | 说明 |
|-------|------|
| 忘记区分手动关闭和意外断开 | `close()` 后不应重连 |
| 心跳定时器泄漏 | 每次 `_connect()` 前必须清理所有定时器 |
| 重连成功后不重置 retryCount | 否则退避间隔会越来越大 |
| pong 超时不主动断开 | 需要 `ws.close()` 触发 `onclose` 才能重连 |
| 消息队列无上限 | 可能导致内存溢出，必须设置 `maxQueueSize` |
| 不处理 WebSocket 构造函数异常 | `new WebSocket('invalid')` 会抛错 |
