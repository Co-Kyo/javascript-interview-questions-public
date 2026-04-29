> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 15 - 发布订阅 EventEmitter

## 基本信息

- **分类**：数据结构与算法
- **难度**：⭐⭐⭐
- **考察点**：事件管理、发布订阅模式、on/off/emit/once

---

## 背景

发布订阅模式是前端开发中最核心的设计模式之一，广泛应用于：

- **Vue EventBus**：Vue 2 中跨组件通信的经典方案
- **Node.js EventEmitter**：Node.js 事件驱动架构的基石，`http`、`stream`、`fs` 等核心模块均基于它构建
- **DOM 事件系统**：`addEventListener` / `removeEventListener` 本身就是发布订阅的实现
- **状态管理**：Redux、Vuex 等库内部的 `subscribe` 机制

理解 EventEmitter 的实现原理，是理解整个前端事件驱动体系的基础。

---

## 题目要求

请实现一个 `EventEmitter` 类，支持以下方法：

### `on(event, fn)`

注册事件监听器。同一事件可以注册多个监听器，按注册顺序依次触发。

### `off(event, fn)`

移除指定事件的特定监听器。必须精确匹配函数引用才能移除。

### `emit(event, ...args)`

触发指定事件，依次调用该事件的所有监听器，并传入参数。

### `once(event, fn)`

注册一次性监听器，触发一次后自动移除。

---

## 示例

```js
const emitter = new EventEmitter();

// 基础用法
function handler(data) {
  console.log('received:', data);
}
emitter.on('message', handler);
emitter.emit('message', 'hello');
// 输出: received: hello

// 移除监听器
emitter.off('message', handler);
emitter.emit('message', 'hello');
// 无输出

// once 只触发一次
emitter.once('click', (pos) => {
  console.log('clicked at:', pos);
});
emitter.emit('click', { x: 10, y: 20 });
// 输出: clicked at: { x: 10, y: 20 }
emitter.emit('click', { x: 30, y: 40 });
// 无输出（已被自动移除）
```

---

## 约束条件

1. 支持同一事件注册多个监听器，`emit` 时按注册顺序依次调用
2. `off` 必须精确匹配函数引用，不能移除无关监听器
3. `once` 监听器触发一次后自动移除，不能影响其他监听器
4. `emit` 未注册的事件时应静默处理，不报错
5. `off` 移除不存在的监听器时应静默处理，不报错
6. `off` 应能移除 `once` 注册的监听器（通过原始函数引用）

---

## 加分项（可选实现）

- 实现 `removeAllListeners(event)` — 移除某事件的所有监听器
- 实现 `listenerCount(event)` — 返回某事件的监听器数量
- 实现 `eventNames()` — 返回所有已注册事件的名称列表

---

## 评判标准

| 等级 | 要求 |
|------|------|
| ✅ 及格 | 正确实现 on/off/emit 基本功能 |
| ✅ 良好 | 正确实现 once，处理边界情况 |
| ✅ 优秀 | 实现加分项，代码结构清晰，考虑性能和内存安全 |
