> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# 24 - 跨标签页通信

## 基本信息

| 项目 | 内容 |
|------|------|
| 分类 | DOM 与浏览器 API |
| 难度 | ⭐⭐⭐ |
| 考察点 | BroadcastChannel、localStorage storage 事件、同源策略、优雅降级 |

## 背景

在现代 Web 应用中，用户经常同时打开多个标签页访问同一个站点。登录状态同步、购物车数据同步、SSO 单点登出等场景都需要标签页之间实时通信。浏览器提供了 `BroadcastChannel`（专为此场景设计）和 `localStorage` 的 `storage` 事件（经典降级方案）两种机制。

## 题目要求

实现一个 `CrossTab` 类：

1. **自动选择通信方式**：优先使用 `BroadcastChannel`，不支持则降级到 `localStorage` 的 `storage` 事件
2. **消息类型区分**：支持 `type` 字段区分不同业务消息
3. **`post(type, payload)`**：向其他标签页广播消息
4. **`on(type, callback)`**：按类型订阅消息；支持通配符 `'*'` 监听所有消息
5. **`off(type, callback)`**：取消指定订阅
6. **`destroy()`**：释放所有资源

## 示例

```javascript
// 标签页 A
const tabA = new CrossTab('my-app');
tabA.post('LOGIN', { userId: '123', name: 'Alice' });

// 标签页 B
const tabB = new CrossTab('my-app');
tabB.on('LOGIN', (payload) => {
  console.log('用户已登录:', payload.name); // → 用户已登录: Alice
});
tabB.on('*', (type, payload) => {
  console.log('收到消息:', type, payload);
});
```

## 约束

1. 通信仅在同源标签页之间生效（浏览器安全模型要求）
2. 发送消息的标签页不应收到自己发出的消息
3. `destroy()` 后不再接收或发送任何消息
4. payload 需可 JSON 序列化
