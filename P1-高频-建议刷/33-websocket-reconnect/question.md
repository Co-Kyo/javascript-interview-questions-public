> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# 33 - WebSocket 自动重连 + 心跳

## 分类
工程实用场景

## 难度
⭐⭐⭐

## 考察点
WebSocket API、指数退避重连、心跳保活、事件管理

---

## 题目要求

实现 `ReconnectWebSocket` 类，具备以下能力：

### 1. 自动重连（指数退避）

- 连接意外断开后自动重连，间隔按 1s → 2s → 4s → 8s → ... 递增
- 重连成功后重置退避间隔
- 支持最大重连次数，超过后停止重连

### 2. 心跳检测（Ping/Pong）

- 连接建立后定期发送心跳（默认 30 秒）
- 收到 `pong` 后重置计时器
- 超时未收到 `pong` 则主动关闭并触发重连

### 3. 消息队列

- 断线期间 `send()` 的消息缓存到队列，连接恢复后自动按序发送
- 队列有上限，超出时丢弃最早消息

### 4. 手动控制

- 调用 `close()` 断开连接，**不触发自动重连**
- 区分手动关闭与意外断开

## 使用示例

```javascript
const ws = new ReconnectWebSocket('wss://example.com/ws', {
  maxRetries: 10,
  heartbeatInterval: 30000,
  heartbeatTimeout: 5000,
  maxQueueSize: 1000,
});

ws.onopen = () => console.log('已连接');
ws.onmessage = (data) => console.log('收到:', data);
ws.onreconnecting = ({ retryCount, delay }) =>
  console.log(`第 ${retryCount} 次重连，${delay}ms 后执行`);
ws.onreconnected = () => console.log('重连成功');
ws.onmaxretries = () => console.log('重连次数用尽');

ws.send(JSON.stringify({ type: 'chat', content: 'hello' }));
ws.close(); // 手动关闭，不触发重连
```

## 约束条件

- 使用原生 `WebSocket` API，不依赖第三方库
- 手动 `close()` 后不触发自动重连
- 代码应具备良好的错误处理和边界条件考虑
