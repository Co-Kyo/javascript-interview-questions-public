> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# 24 - 跨标签页通信

## 分类
DOM 与浏览器 API

## 难度
⭐⭐⭐

## 考察点
- BroadcastChannel API 的使用
- localStorage `storage` 事件的跨标签页触发机制
- 同源策略（Same-Origin Policy）对跨标签页通信的约束
- 优雅降级策略设计
- 资源清理与内存泄漏防范

---

## 背景

在现代 Web 应用中，用户经常会同时打开多个标签页访问同一个站点。以下场景需要标签页之间进行实时通信：

1. **登录状态同步**：用户在标签页 A 登录后，标签页 B 应自动感知登录状态变化，无需刷新。
2. **购物车数据同步**：用户在标签页 A 添加商品到购物车，标签页 B 的购物车角标应实时更新。
3. **SSO 单点登出**：用户在任一标签页登出，其余标签页应同步登出，避免状态不一致。
4. **避免重复操作**：如防止同一用户在多标签页重复提交表单。

浏览器提供了多种跨标签页通信机制，其中 `BroadcastChannel` 是专为此场景设计的 API，而 `localStorage` 的 `storage` 事件则是一种经典的降级方案。

---

## 题目要求

请实现一个 `CrossTab` 类，满足以下要求：

### 基本功能

1. **自动选择通信方式**：优先使用 `BroadcastChannel`，若浏览器不支持则降级到 `localStorage` 的 `storage` 事件。
2. **消息类型区分**：支持通过 `type` 字段区分不同业务消息（如 `LOGIN`、`LOGOUT`、`CART_UPDATE`）。
3. **发送消息**：提供 `post(type, payload)` 方法，向其他标签页广播消息。
4. **监听消息**：提供 `on(type, callback)` 方法，按类型订阅消息；支持通配符 `'*'` 监听所有消息。
5. **取消监听**：提供 `off(type, callback)` 方法，取消指定的订阅。
6. **断开清理**：提供 `destroy()` 方法，释放所有资源（关闭 BroadcastChannel、移除事件监听器、清理 localStorage 临时数据）。

### 使用示例

```javascript
// 标签页 A
const tabA = new CrossTab('my-app');
tabA.post('LOGIN', { userId: '123', name: 'Alice' });

// 标签页 B
const tabB = new CrossTab('my-app');
tabB.on('LOGIN', (payload) => {
  console.log('用户已登录:', payload.name); // 输出: 用户已登录: Alice
});

// 标签页 C - 监听所有消息
const tabC = new CrossTab('my-app');
tabC.on('*', (type, payload) => {
  console.log('收到消息:', type, payload);
});
```

### 约束条件

1. **同源限制**：通信仅在同源（协议 + 域名 + 端口）的标签页之间生效，这是浏览器安全模型的要求，无需处理跨域情况。
2. **消息不回显**：发送消息的标签页不应收到自己发出的消息。
3. **资源清理**：`destroy()` 后不再接收或发送任何消息。
4. **序列化安全**：payload 会被 `JSON.stringify`，确保不包含循环引用。
5. **storage 降级方案**：使用 localStorage 临时 key（带时间戳）传递消息，监听 `storage` 事件后清理。

---

## 评分标准

| 维度 | 说明 | 权重 |
|------|------|------|
| 正确性 | BroadcastChannel 和 storage 降级均能正常工作 | 35% |
| 降级策略 | feature detection 准确，降级切换流畅 | 20% |
| 消息过滤 | 发送方不回显，类型匹配正确，通配符生效 | 15% |
| 资源管理 | destroy 清理彻底，无内存泄漏 | 15% |
| 代码质量 | 结构清晰，注释恰当，边界处理完善 | 15% |

---

## 进阶追问

1. **为什么 `storage` 事件只在**其他**标签页触发，当前标签页不会触发？**
2. **如果需要跨域通信，有哪些方案？**（如 `postMessage` + iframe）
3. **BroadcastChannel 和 SharedWorker 的适用场景区别是什么？**
4. **如何保证消息的可靠送达？如果目标标签页还没加载完怎么办？**
