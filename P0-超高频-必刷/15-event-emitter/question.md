> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 15 - 发布订阅 EventEmitter

- **分类**：数据结构与算法 | **难度**：⭐⭐⭐ | **考察点**：事件管理、发布订阅模式、on/off/emit/once

## 题目要求

实现一个 `EventEmitter` 类，支持以下方法：

- **`on(event, fn)`** — 注册事件监听器，同一事件可注册多个，按注册顺序触发
- **`off(event, fn)`** — 移除指定事件的特定监听器，精确匹配函数引用
- **`emit(event, ...args)`** — 触发事件，依次调用所有监听器
- **`once(event, fn)`** — 注册一次性监听器，触发后自动移除

## 示例

```javascript
const emitter = new EventEmitter();

emitter.on('message', (data) => console.log(data));
emitter.emit('message', 'hello'); // 输出: hello

emitter.once('click', (pos) => console.log(pos));
emitter.emit('click', { x: 10 }); // 输出: { x: 10 }
emitter.emit('click', { x: 20 }); // 无输出（已自动移除）
```

## 约束

1. 支持同一事件注册多个监听器，`emit` 时按注册顺序依次调用
2. `off` 精确匹配函数引用，`off` 移除不存在的监听器时静默处理
3. `once` 触发后自动移除，不影响其他监听器
4. `emit` 未注册的事件时静默返回 `false`
5. `off` 应能移除 `once` 注册的监听器（通过原始函数引用）

## 加分项

- `removeAllListeners(event)` — 移除某事件的所有监听器
- `listenerCount(event)` — 返回某事件的监听器数量
- `eventNames()` — 返回所有已注册事件的名称列表
