> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# 33 - WebSocket 自动重连 + 心跳

## 基本信息

| 属性 | 值 |
|------|-----|
| 分类 | 工程实用场景 |
| 难度 | ⭐⭐⭐ |
| 考察点 | WebSocket API、指数退避重连、心跳保活、事件管理 |

## 题目背景

在即时通讯（IM）、实时数据推送（股票行情、体育比分）、在线状态同步等场景中，WebSocket 连接的稳定性至关重要。然而实际网络环境复杂，连接可能随时断开——WiFi 切换、服务端重启、NAT 超时、运营商网关回收空闲连接等。

裸 `WebSocket` API 仅提供 `onopen`/`onclose`/`onerror`/`onmessage` 四个事件，**没有任何内置的重连或保活机制**。你需要封装一个生产级的 `ReconnectWebSocket` 类，补齐这些关键能力。

## 题目要求

实现 `ReconnectWebSocket` 类，满足以下功能：

### 1. 自动重连（指数退避）

- 连接意外断开后自动发起重连
- 重连间隔按指数退避策略递增：1s → 2s → 4s → 8s → 16s → ...
- 重连成功后重置退避间隔
- 支持设置最大重连次数（超过后停止重连）

### 2. 心跳检测（Ping/Pong）

- 连接建立后，定期发送心跳消息（默认每 30 秒）
- 收到服务端响应（pong）后重置心跳计时器
- 超时未收到 pong 则判定连接已死，主动关闭并触发重连

### 3. 消息队列

- 连接断开期间，调用 `send()` 的消息不丢失
- 消息缓存到队列中，连接恢复后自动按序发送

### 4. 手动控制

- 支持手动调用 `close()` 断开连接，**不触发自动重连**
- 区分"手动关闭"与"意外断开"

## 使用示例

```javascript
const ws = new ReconnectWebSocket('wss://example.com/ws', {
  maxRetries: 10,        // 最多重连 10 次
  heartbeatInterval: 30000, // 30 秒心跳
  heartbeatTimeout: 5000,   // 5 秒 pong 超时
  maxQueueSize: 1000,    // 消息队列上限（超出丢弃最早）
});

ws.onopen = () => console.log('已连接');
ws.onmessage = (data) => console.log('收到消息:', data);
ws.onclose = () => console.log('连接关闭');
ws.onerror = (err) => console.log('发生错误:', err);
ws.onreconnecting = ({ retryCount, delay }) =>
  console.log(`第 ${retryCount} 次重连，${delay}ms 后执行`);
ws.onreconnected = () => console.log('重连成功');
ws.onmaxretries = () => console.log('重连次数用尽，已停止');

// 发送消息（断线时自动缓存）
ws.send(JSON.stringify({ type: 'chat', content: 'hello' }));

// 查询连接状态
console.log(ws.readyState === WebSocket.OPEN ? '已连接' : '未连接');

// 手动关闭（不触发重连）
ws.close();
```

## 验证用例

实现完成后，可用以下方式验证核心逻辑：

```javascript
// 1. 消息队列：断线时 send，重连后自动 flush
ws.send('msg1'); // 断线中 → 入队
// 重连成功后自动发送 msg1

// 2. 指数退避：观察日志中 delay 递增 1s → 2s → 4s → ...
// 3. 心跳超时：服务端不回 pong → 5s 后自动断开重连
// 4. 手动关闭：ws.close() 后不再重连
// 5. 队列上限：超过 maxQueueSize 后丢弃最早消息
```

## 重连时序示例

```
连接成功 → 正常通信 → 网络断开
  ↓
等待 1s → 尝试重连 → 失败
  ↓
等待 2s → 尝试重连 → 失败
  ↓
等待 4s → 尝试重连 → 成功 ✅
  ↓
重置间隔为 1s，发送队列中的缓存消息，恢复心跳
```

## 约束条件

- 使用原生 `WebSocket` API，不依赖第三方库
- 必须支持最大重连次数配置
- 手动调用 `close()` 后不触发自动重连
- 代码应具备良好的错误处理和边界条件考虑

## 加分项

- 支持连接状态事件回调（`onreconnecting`、`onreconnected`）
- 心跳消息格式可自定义
- 支持 `maxReconnectInterval` 上限（避免退避间隔过大）
