# 24 - 跨标签页通信 · 五步讲解

---

## 第一步：理解问题与核心约束

### 为什么需要跨标签页通信？

浏览器中每个标签页是独立的 JavaScript 执行环境，它们之间**默认无法直接通信**。但在实际业务中，多个标签页共享同一个站点的登录态、购物车、通知等状态，需要实时同步。

### 核心约束：同源策略

浏览器的安全模型要求跨标签页通信必须满足**同源**（协议 + 域名 + 端口完全一致）。这不是代码层面的限制，而是浏览器的硬性安全边界。

### 两种通信机制对比

| 特性 | BroadcastChannel | localStorage + storage 事件 |
|------|-----------------|---------------------------|
| 设计目的 | 专为跨标签页通信设计 | 利用副作用实现的 hack |
| 兼容性 | Chrome 54+, Firefox 38+, Safari 15.4+ | 全浏览器支持 |
| 数据大小 | 无特殊限制 | 受 localStorage 5MB 限制 |
| 回显行为 | 需手动过滤 | 天然不回显（只在其他标签页触发） |
| 可靠性 | 高（专用通道） | 中等（依赖事件时序） |

**设计原则：优先使用 BroadcastChannel，不支持时降级到 storage 事件。**

---

## 第二步：BroadcastChannel 实现

### 基本原理

`BroadcastChannel` 是浏览器提供的原生 API，同源的所有标签页可以通过同一个频道名称建立通信管道。

```javascript
// 标签页 A
const bc = new BroadcastChannel('my-app');
bc.postMessage({ type: 'LOGIN', payload: { userId: '123' } });

// 标签页 B
const bc = new BroadcastChannel('my-app');
bc.onmessage = (event) => {
  console.log(event.data); // { type: 'LOGIN', payload: { userId: '123' } }
};
```

### 关键点

1. **频道名称匹配**：同名的 BroadcastChannel 实例自动形成一个通信组。
2. **`postMessage` 是同步调用**，但消息传递是异步的（微任务队列）。
3. **发送方也会收到自己发出的消息**，需要通过 `senderId` 过滤。
4. **关闭频道**：调用 `bc.close()` 释放资源，否则可能内存泄漏。

### 自身回显问题

这是 BroadcastChannel 与 storage 事件的重大区别：

- **BroadcastChannel**：发送方会收到自己的消息 → **必须手动过滤**
- **storage 事件**：只在其他标签页触发 → **天然不回显**

解决方案：为每个实例生成唯一 `senderId`，消息中携带该 ID，接收时比对过滤。

---

## 第三步：localStorage 降级方案

### 原理

当一个标签页修改 `localStorage` 时，浏览器会在**其他同源标签页**触发 `storage` 事件。这是一个非设计用途但被广泛使用的跨标签页通信手段。

### 实现要点

```javascript
// 发送方：写入 localStorage
const message = { type: 'LOGIN', payload: { userId: '123' }, senderId: id };
localStorage.setItem(`__crosstab_my-app_${Date.now()}`, JSON.stringify(message));

// 接收方：监听 storage 事件
window.addEventListener('storage', (event) => {
  if (event.key?.startsWith('__crosstab_my-app_') && event.newValue) {
    const message = JSON.parse(event.newValue);
    dispatch(message);
  }
});
```

### 注意事项

1. **key 必须变化**：如果 `setItem` 的 key 和 value 都没变，`storage` 事件不会触发。解决方案是在 key 中加入时间戳。
2. **及时清理**：消息消费后 `removeItem`，避免 localStorage 空间浪费。
3. **异常处理**：隐私模式或存储满时 `setItem` 会抛异常，需要 try-catch。
4. **`event.newValue` 为 null**：当 key 被 `removeItem` 时触发的 storage 事件，`newValue` 为 null，需要过滤。

---

## 第四步：完整 CrossTab 类设计

### 架构

```
CrossTab 实例
├── Feature Detection（检测 BroadcastChannel 支持）
├── 通信层
│   ├── BroadcastChannel（主方案）
│   └── localStorage + storage 事件（降级方案）
├── 消息分发
│   ├── 精确匹配监听器（type → callback）
│   └── 通配符监听器（'*' → callback）
└── 资源管理
    ├── destroy() 关闭频道 / 移除监听
    └── 清理 localStorage 残留 key
```

### 核心设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 监听器存储 | `Map<string, Set<Function>>` | O(1) 类型查找，Set 自动去重 |
| 自身过滤 | 实例级 `senderId` | 简单可靠，无需额外协议 |
| 通配符回调签名 | `(type, payload)` | 多一个 type 参数，方便通用处理 |
| 销毁后行为 | 静默忽略 + console.warn | 不抛异常，避免影响业务 |

### 完整流程

1. `new CrossTab('my-app')` → 检测 BC 支持，初始化通信层
2. `tab.on('LOGIN', cb)` → 注册监听器到 Map
3. `tab.post('LOGIN', data)` → 序列化消息 → 通过 BC/LS 发送
4. 其他标签页收到 → `_dispatch()` → 过滤自身 → 匹配监听器 → 执行回调
5. `tab.destroy()` → 关闭频道/移除监听 → 清理 Map

---

## 第五步：进阶思考与常见陷阱

### 常见陷阱

1. **忘记过滤自身消息**：BroadcastChannel 发送方也会收到消息，不做 senderId 过滤会导致逻辑重复执行。
2. **localStorage key 堆积**：降级方案中不清理临时 key，长期使用后 localStorage 被撑满。
3. **destroy 后继续使用**：不检查 `_destroyed` 状态，可能导致访问已关闭的 BroadcastChannel 抛异常。
4. **storage 事件的 key 过滤不严**：其他模块也可能写入类似前缀的 key，需要用精确前缀匹配。

### 进阶问题

**Q: 为什么 storage 事件只在其他标签页触发？**
A: 这是 HTML 规范的设计——storage 事件的目的是通知其他浏览上下文（browsing context）存储发生了变化，自身已经知道变化了，无需再通知。

**Q: 如何实现跨域通信？**
A: BroadcastChannel 和 storage 事件都受同源策略限制。跨域场景可以使用：
- `window.postMessage()` + 隐藏 iframe（目标域加载一个代理页面）
- SharedWorker（同源限制但可跨标签页共享状态）
- 服务端中转（WebSocket / SSE）

**Q: BroadcastChannel vs SharedWorker？**
A: BroadcastChannel 是简单的发布-订阅，适合轻量消息广播；SharedWorker 是共享的后台线程，适合需要持久状态和复杂逻辑的场景（如共享 WebSocket 连接、数据库连接池）。

**Q: 如何保证消息可靠送达？**
A: 基础方案不保证送达（fire-and-forget）。如果需要可靠送达：
- 引入 ACK 机制：接收方回复确认，发送方超时重试
- 结合 IndexedDB 做消息持久化队列
- 或直接使用 SharedWorker / 服务端推送
