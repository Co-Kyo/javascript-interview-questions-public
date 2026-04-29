# 33 - WebSocket 自动重连 + 心跳 - 五步讲解

## 第一步：理解问题本质

裸 `WebSocket` API 极其简单——只有四个事件回调（`onopen`、`onclose`、`onerror`、`onmessage`），**没有任何内置的重连或保活机制**。在生产环境中，WebSocket 连接随时可能因为以下原因断开：

- **网络切换**：WiFi ↔ 4G、进入电梯
- **服务端重启**：部署更新、进程崩溃
- **NAT/防火墙超时**：运营商网关回收空闲连接（通常 60-120s）
- **浏览器后台挂起**：移动端浏览器切到后台，定时器被节流

所以需要封装一个 `ReconnectWebSocket` 类，补齐三个关键能力：**自动重连**、**心跳保活**、**消息缓存**。

---

## 第二步：指数退避重连策略

**核心思想**：重连失败后，每次等待时间翻倍，避免在网络恢复前疯狂重试（"惊群效应"）。

```
第 1 次：等 1s
第 2 次：等 2s
第 3 次：等 4s
第 4 次：等 8s
第 5 次：等 16s
...以此类推，直到达到上限
```

**实现要点**：

1. **计算公式**：`delay = min(initialInterval × 2^retryCount, maxInterval)`
   - 用 `Math.pow(2, retryCount)` 实现指数增长
   - 用 `Math.min()` 限制上限，避免等待过久（如超过 30s）

2. **重置机制**：连接成功后将 `retryCount` 归零，下次断开从 1s 重新开始

3. **上限控制**：必须有 `maxRetries`，达到上限后停止重连，避免无限循环

4. **手动关闭标记**：`isManualClose` 区分主动断开和意外断开——只有意外断开才触发重连

```javascript
// 关键代码逻辑
const delay = Math.min(
  this.reconnectInterval * Math.pow(2, this.retryCount),
  this.maxReconnectInterval
);
setTimeout(() => {
  this.retryCount++;
  this._connect();
}, delay);
```

---

## 第三步：心跳检测机制

**为什么需要心跳？**

TCP 连接本身有 Keep-Alive，但：
- 浏览器的 WebSocket **无法控制 TCP Keep-Alive 参数**
- 中间代理/NAT 可能在 60-120s 无数据后回收连接
- 应用层心跳是唯一可靠的检测手段

**Ping/Pong 流程**：

```
客户端 → 服务端: "ping"        (每 30s 发一次)
服务端 → 客户端: "pong"        (收到 ping 后回复)
客户端收到 pong → 清除超时计时器

如果 5s 内没收到 pong → 判定连接已死 → 主动 close → 触发重连
```

**实现要点**：

1. 用 `setInterval` 定期发送 ping
2. 发送 ping 的同时启动 `setTimeout`（如 5s）作为 pong 超时计时器
3. 收到 pong 时 `clearTimeout` 重置计时器
4. 超时未收到 pong → `ws.close()` 主动断开 → `onclose` 触发重连

**注意**：心跳消息格式需要和服务端约定。本题简化为文本 `"ping"` / `"pong"`，实际项目中可能是 JSON 或二进制帧。

---

## 第四步：消息缓存队列

**场景**：用户在断线期间调用 `send()`，消息不能丢。

```javascript
send(data) {
  if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    this.ws.send(data);           // 连接正常 → 直接发
  } else {
    this.messageQueue.push(data); // 连接断开 → 入队缓存
  }
}
```

**关键决策**：

1. **队列还是丢弃？** 大多数场景选队列（保证消息不丢），但实时性极强的场景（如游戏帧同步）可能选择丢弃旧消息
2. **队列上限？** 已实现 `maxQueueSize`（默认 1000），超出时丢弃最早消息，防止内存溢出
3. **何时发送？** 在 `onopen` 回调中按序 `flush`，保证消息顺序

---

## 第五步：状态管理与边界条件

一个生产级实现需要处理大量边界条件：

| 场景 | 处理方式 |
|------|----------|
| 手动 `close()` 后不重连 | `isManualClose` 标记，在 `onclose` 中判断 |
| 重连期间再次断开 | 清理旧的重连定时器，重新调度 |
| `maxRetries` 用尽 | 停止重连，触发 `onmaxretries` 回调 |
| WebSocket 构造函数抛异常 | `try-catch` 包裹，走重连逻辑 |
| 页面卸载时清理 | `beforeunload` 事件中调用 `close()` |
| 心跳定时器泄漏 | 每次 `_connect()` 前清理所有定时器 |
| 查询连接状态 | `readyState` getter 兼容 WebSocket 原生常量 |
| 手动关闭后重连 | 重连成功时自动重置 `isManualClose` 标记 |

**设计原则**：

- **防御式编程**：所有外部输入（URL、回调）都要有兜底
- **单一职责**：重连、心跳、队列各自独立管理
- **可观测性**：提供 `onreconnecting`、`onreconnected` 等事件，让调用方知道当前状态

### 面试追问方向

- 如何实现心跳消息的自定义格式（JSON/二进制）？
- 如何处理 WebSocket 连接成功但服务端实际不可用的情况？
- 多标签页场景下如何避免重复连接？
- 如何结合 `navigator.onLine` 优化重连策略？
