> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 28 - 观察者模式 vs 发布订阅模式

- **分类**：设计模式与架构 | **难度**：⭐⭐ | **考察点**：设计模式对比、解耦、事件中心

## 题目要求

分别实现观察者模式和发布订阅模式，并说明核心差异。

### 1. Observer（观察者）模式

- `Subject` 类：支持 `subscribe`、`unsubscribe`、`notify`
- `Observer` 类：包含 `update` 方法
- Subject **直接持有** Observer 引用，**直接调用** `update()`
- 重复订阅应去重（用 Set）；取消不存在的订阅应静默处理

### 2. PubSub（发布订阅）模式

- `EventBus` 类：支持 `on`、`off`、`emit`、`once`
- 发布者和订阅者**互不知道对方**，完全通过事件中心通信
- `once` 一次性订阅（触发后自动取消）
- `off(event)` 不传 callback 应清除该事件所有订阅
- 触发不存在的事件应静默处理

### 3. 对比分析

| 维度 | Observer | PubSub |
|------|----------|--------|
| 耦合关系 | Subject 直接引用 Observer | 发布者和订阅者无直接关系 |
| 通信方式 | Subject 调用 Observer.update() | 通过事件中心转发 |
| 中间层 | 无 | EventBus |
| 接口要求 | Observer 必须实现 update() | 任意函数均可订阅 |
| 事件粒度 | 无事件名，通知所有 Observer | 通过事件名精确匹配 |
| 典型应用 | Vue 2 响应式、RxJS | Node.js EventEmitter、EventBus |

## 示例

```javascript
// Observer 模式
const subject = new Subject();
const observer = new Observer('logger', (data) => console.log(data));
subject.subscribe(observer);
subject.notify('状态变化'); // observer.update('状态变化')

// PubSub 模式
const bus = new EventBus();
bus.on('user:login', (user) => console.log(user.name));
bus.emit('user:login', { name: 'Alice' }); // 输出: Alice
```

## 约束

- JavaScript ES6+ 实现
- 不使用第三方库
- 两种模式代码量大致相当，便于对比
