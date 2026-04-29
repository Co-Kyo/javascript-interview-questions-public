> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 28 - 观察者模式 vs 发布订阅模式

## 基本信息

- **分类**：设计模式与架构
- **难度**：⭐⭐
- **考察点**：设计模式对比、解耦、事件中心

## 题目描述

观察者模式（Observer Pattern）和发布订阅模式（Publish-Subscribe Pattern）是前端开发中最常用的两种事件驱动设计模式。它们表面上很像——都是"一方发生变化，通知另一方"——但实现机制和耦合程度有本质区别。

请分别实现这两种模式，并说明它们的核心差异。

## 要求

### 1. 实现 Observer（观察者）模式

- 创建 `Subject`（主题/被观察者）类，支持 `subscribe`、`unsubscribe`、`notify` 方法
- 创建 `Observer`（观察者）类，包含 `update` 方法
- Subject **直接持有** Observer 的引用，状态变化时**直接调用** Observer 的 `update` 方法
- Subject 和 Observer 之间是**直接耦合**的关系
- **边界条件**：重复订阅应去重；取消不存在的订阅应静默处理

### 2. 实现 PubSub（发布订阅）模式

- 创建 `EventBus`（事件中心）类，支持 `on`、`off`、`emit`、`once` 方法
- 发布者通过 `emit` 发布事件，订阅者通过 `on` 订阅事件
- `once` 实现一次性订阅（触发后自动取消）
- 发布者和订阅者**互不知道对方**，完全通过事件中心通信
- 三方解耦：发布者、订阅者、事件中心各自独立
- **边界条件**：触发不存在的事件应静默处理；`off(event)` 不传 callback 应清除该事件所有订阅

### 3. 对比分析

请用一段代码示例分别演示两种模式的调用方式，并说明以下差异：

| 对比维度 | Observer 模式 | PubSub 模式 |
|---------|-------------|------------|
| 耦合关系 | Subject 直接引用 Observer | 发布者和订阅者无直接关系 |
| 通信方式 | Subject 主动调用 Observer.update() | 通过事件中心转发 |
| 中间层 | 无 | EventBus（事件中心） |
| 灵活性 | 低，依赖已知的 Observer 接口 | 高，任意对象均可订阅 |
| 事件粒度 | 无事件名，通知所有 Observer | 通过事件名精确匹配，粒度更细 |
| 典型应用 | Vue 2 响应式、RxJS | Node.js EventEmitter、EventBus |

## 约束

- 代码使用 JavaScript（ES6+）实现
- 代码结构清晰，注释说明核心区别
- 两种模式的代码量应大致相当，便于对比
- 不使用任何第三方库

## 参考答案结构

```javascript
// 1. Observer 模式实现（Subject + Observer 类）
// 2. PubSub 模式实现（EventBus 类，含 on/off/emit/once）
// 3. 对比演示（两种模式的调用方式 + console 输出）
```
