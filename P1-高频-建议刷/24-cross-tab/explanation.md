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
| 回显行为 | 需手动过滤 | 天然不回显（只在其他标签页触发） |
| 可靠性 | 高（专用通道） | 中等（依赖事件时序） |

**设计原则：优先使用 BroadcastChannel，不支持时降级到 storage 事件。**

---

## 第二步：BroadcastChannel 实现

### 基本原理

`BroadcastChannel` 是浏览器提供的原生 API，同源的所有标签页可以通过同一个频道名称建立通信管道。

```javascript
const bc = new BroadcastChannel('my-app');
bc.postMessage({ type: 'LOGIN', payload: { userId: '123' } });

const bc2 = new BroadcastChannel('my-app');
bc.onmessage = (event) => {
  console.log(event.data);
};
```

上述代码展示了两个标签页的通信：前两行是发送方，后三行是另一个标签页中的接收方，通过相同频道名称建立连接。

### 自身回显问题

BroadcastChannel 与 storage 事件的重大区别：

- **BroadcastChannel**：发送方也会收到自己的消息 → **必须手动过滤**
- **storage 事件**：只在其他标签页触发 → **天然不回显**

解决方案：为每个实例生成唯一 `senderId`，消息中携带该 ID，接收时比对过滤。

---

## 第三步：逐步实现

### 3.1 构造函数与通信层初始化

```javascript
constructor(channelName) {
  if (typeof channelName !== 'string' || !channelName) {
    throw new TypeError('CrossTab: channelName 必须为非空字符串');
  }

  this._channelName = channelName;
  this._listeners = new Map();
  this._destroyed = false;
  this._senderId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  this._useBC = typeof BroadcastChannel !== 'undefined';

  if (this._useBC) {
    this._bc = new BroadcastChannel(channelName);
    this._bc.onmessage = (event) => this._dispatch(event.data);
  } else {
    this._storageKey = `__crosstab_${channelName}`;
    this._onStorage = (event) => {
      if (!event.key || !event.key.startsWith(this._storageKey) || event.newValue === null) return;
      try {
        const message = JSON.parse(event.newValue);
        this._dispatch(message);
        localStorage.removeItem(event.key);
      } catch {
      }
    };
    window.addEventListener('storage', this._onStorage);
  }
}
```

**`_senderId`**：用时间戳 + 随机数生成唯一标识，用于过滤自身回显。

**Feature Detection**：`typeof BroadcastChannel !== 'undefined'` 检测是否支持 BC，不支持则降级。

**storage 降级的关键**：`event.newValue === null` 过滤掉 `removeItem` 触发的事件；`event.key.startsWith(this._storageKey)` 精确匹配前缀避免误收其他模块的消息。空的 `catch` 块是因为 `JSON.parse` 可能遇到非法数据，静默忽略即可，不应因为解析失败影响整个监听逻辑。

### 3.2 发送消息 post

```javascript
post(type, payload) {
  if (this._destroyed) {
    console.warn('CrossTab: 实例已销毁，无法发送消息');
    return;
  }

  const message = {
    type,
    payload,
    senderId: this._senderId,
    timestamp: Date.now(),
  };

  if (this._useBC) {
    this._bc.postMessage(message);
  } else {
    const key = `${this._storageKey}_${Date.now()}`;
    try {
      localStorage.setItem(key, JSON.stringify(message));
      setTimeout(() => localStorage.removeItem(key), 100);
    } catch (e) {
      console.warn('CrossTab: localStorage 写入失败', e);
    }
  }
}
```

**storage 降级中 key 必须变化**：如果 `setItem` 的 key 和 value 都没变，`storage` 事件不会触发。在 key 中加入时间戳确保每次写入都算"值变化"。

**及时清理**：消息发送后短暂保留再清理，避免 localStorage 空间浪费。`try-catch` 处理隐私模式或存储满时的写入异常。

### 3.3 订阅与取消订阅

```javascript
on(type, callback) {
  if (this._destroyed) return this;
  if (!this._listeners.has(type)) {
    this._listeners.set(type, new Set());
  }
  this._listeners.get(type).add(callback);
  return this;
}

off(type, callback) {
  const cbs = this._listeners.get(type);
  if (cbs) {
    cbs.delete(callback);
    if (cbs.size === 0) this._listeners.delete(type);
  }
  return this;
}
```

**`Map<string, Set<Function>>`**：O(1) 类型查找，Set 自动去重。`on` 返回 `this` 支持链式调用。

### 3.4 消息分发 _dispatch

```javascript
_dispatch(message) {
  if (message.senderId === this._senderId) return;

  const { type, payload } = message;

  const exactListeners = this._listeners.get(type);
  if (exactListeners) {
    exactListeners.forEach((cb) => {
      try { cb(payload); } catch (e) { console.error('CrossTab listener error:', e); }
    });
  }

  const wildcardListeners = this._listeners.get('*');
  if (wildcardListeners) {
    wildcardListeners.forEach((cb) => {
      try { cb(type, payload); } catch (e) { console.error('CrossTab listener error:', e); }
    });
  }
}
```

**先检查 `senderId` 过滤自身**：BroadcastChannel 发送方也会收到消息，不做过滤会导致逻辑重复执行。

**精确匹配 + 通配符**：先触发精确匹配的监听器，再触发 `'*'` 通配符监听器。通配符回调多一个 `type` 参数，方便通用处理。

---

## 第四步：常见追问

**Q: 为什么 `storage` 事件只在其他标签页触发？**

HTML 规范的设计——storage 事件的目的是通知其他浏览上下文存储发生了变化，自身已经知道变化了，无需再通知。

**Q: 如何实现跨域通信？**

BroadcastChannel 和 storage 事件都受同源策略限制。跨域场景可以使用 `window.postMessage()` + 隐藏 iframe，或服务端中转（WebSocket / SSE）。

**Q: BroadcastChannel vs SharedWorker？**

BroadcastChannel 是简单的发布-订阅，适合轻量消息广播；SharedWorker 是共享的后台线程，适合需要持久状态和复杂逻辑的场景。

**Q: 如何保证消息可靠送达？**

基础方案不保证送达（fire-and-forget）。需要可靠送达可引入 ACK 机制：接收方回复确认，发送方超时重试。

---

## 第五步：易错点

| 易错点 | 说明 |
|-------|------|
| 忘记过滤自身消息 | BroadcastChannel 发送方也会收到消息，不做 senderId 过滤会导致逻辑重复执行 |
| localStorage key 堆积 | 降级方案中不清理临时 key，长期使用后 localStorage 被撑满 |
| destroy 后继续使用 | 不检查 `_destroyed` 状态，可能导致访问已关闭的 BroadcastChannel 抛异常 |
| storage 事件 key 过滤不严 | 其他模块也可能写入类似前缀的 key，需精确前缀匹配 |
| storage 事件 newValue 为 null | `removeItem` 触发的事件 `newValue` 为 null，需过滤 |
