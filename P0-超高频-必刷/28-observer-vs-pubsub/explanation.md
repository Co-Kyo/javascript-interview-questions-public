# 28 - 观察者模式 vs 发布订阅模式 - 五步讲解

## 第一步：理解观察者模式（Observer Pattern）

### 核心概念

观察者模式是一种**一对多**的依赖关系：当一个对象（Subject/主题）状态发生变化时，所有依赖它的对象（Observer/观察者）都会被自动通知。

### 关键特征

- **直接引用**：Subject 内部维护一个 Observer 集合（推荐用 Set 去重），直接持有它们的引用
- **直接调用**：状态变化时，Subject 直接调用每个 Observer 的 `update()` 方法
- **接口约定**：Observer 必须实现 `update()` 方法，这是 Subject 对 Observer 的**硬性要求**

### 类比

就像一个老师（Subject）直接点名通知学生（Observer）："下课了！"——老师知道每个学生是谁，学生必须在场（实现 update 接口）。

### 代码结构

```
Subject
├── observers: Set{Observer1, Observer2, ...}
├── subscribe(observer)   → 添加到集合（重复添加无副作用）
├── unsubscribe(observer) → 从集合移除
└── notify(data)          → 遍历调用 observer.update(data)
```

`Subject` 用 `Set` 存储观察者，自动去重。`notify` 时用 `[...this.observers]` 快照遍历，避免通知过程中修改集合导致跳过元素。

### 前端应用

- **Vue 2 响应式**：data 属性通过 `Object.defineProperty` 劫持 → 触发 Dep → 通知 Watcher
- **RxJS**：Observable（Subject）通知 Subscriber（Observer）

### ⚠️ 内存泄漏注意

如果 Subject 持有 Observer 引用但不再需要，必须调用 `unsubscribe()` 移除，否则 Observer 无法被 GC 回收。

---

## 第二步：理解发布订阅模式（PubSub Pattern）

### 核心概念

发布订阅模式在观察者模式基础上增加了一个**事件中心（EventBus）**作为中间层。发布者和订阅者完全解耦——它们互不知道对方的存在，只和事件中心打交道。

### 关键特征

- **完全解耦**：发布者不知道有多少订阅者，订阅者不知道谁是发布者
- **事件中心**：所有通信都通过 EventBus 转发
- **事件名驱动**：通过字符串事件名匹配发布和订阅
- **无接口约束**：任何函数都能订阅，无需实现特定方法

### 代码结构

```
Publisher ──emit(event, data)──→ EventBus ──callback(data)──→ Subscriber
                                  │
                                  ├── events: Map{ 'eventA' → [cb1, cb2] }
                                  ├── on(event, callback)    → 注册订阅
                                  ├── off(event, callback)   → 取消订阅
                                  ├── off(event)             → 清除该事件所有订阅
                                  ├── emit(event, ...args)   → 触发所有回调
                                  └── once(event, callback)  → 一次性订阅
```

`EventBus` 用 `Map` 存储 `事件名 → 回调列表` 的映射。`once` 通过 wrapper 函数实现：wrapper 内部先调用原始回调，再 `off` 自身。`wrapper._original` 保存原始回调引用，支持 `off(event, originalFn)` 取消 once 订阅。

### 前端应用

- **Node.js EventEmitter**：最经典的 PubSub 实现
- **Vue 事件总线**：`new Vue()` 作为 EventBus（Vue 2）
- **Redux**：Store.dispatch → Reducer → Subscriber

### ⚠️ 内存泄漏注意

组件销毁时必须调用 `off()` 取消所有订阅，否则回调闭包持有外部引用导致内存泄漏。

---

## 第三步：对比两种模式的本质区别

### 一张图看清差异

```
【Observer 模式】
  Subject ──── 直接调用 ────→ Observer1
     │     ──── 直接调用 ────→ Observer2
     └───── 直接调用 ────→ Observer3

  ★ Subject 知道所有 Observer，Observer 实现 update() 接口
  ★ 耦合度：高（Subject ↔ Observer 直接依赖）

【PubSub 模式】
  Publisher ──emit──→ EventBus ──callback──→ Subscriber1
                          │    ──callback──→ Subscriber2
                          └─────callback──→ Subscriber3

  ★ 发布者不知道订阅者，订阅者不知道发布者
  ★ 耦合度：低（三方各自独立，仅通过事件名关联）
```

### 五个维度对比

| 维度 | Observer | PubSub |
|------|----------|--------|
| **耦合关系** | Subject ↔ Observer 直接耦合 | 发布者/订阅者/事件中心三方解耦 |
| **通信方式** | Subject 直接调用 `observer.update()` | 通过 EventBus 的 `emit/on` 转发 |
| **接口要求** | Observer 必须实现 `update()` | 无接口要求，任何函数都可订阅 |
| **事件粒度** | 无事件名，通知所有 Observer | 通过事件名精确匹配，粒度更细 |
| **中间层** | 无 | EventBus 是必需的中间层 |

---

## 第四步：实际场景分析

### 场景 1：为什么 Vue 2 用 Observer 模式？

Vue 2 的响应式系统中，`data` 中的每个属性通过 `Object.defineProperty` 劫持 getter/setter，每个依赖该属性的 Dep 管理一组 Watcher，属性变化时 Dep 直接调用 Watcher 的 `update` 方法。watcher 数量有限且在编译时确定，直接调用效率更高。

### 场景 2：为什么 Node.js 用 PubSub 模式？

Node.js 的 EventEmitter 中，服务器发出 `request` 事件，各种中间件/处理器监听 `request` 事件。处理器可能来自不同模块、不同包，无法预知，所以需要解耦。

### 场景 3：什么时候该用哪个？

**用 Observer 当：**
- 观察者数量少且稳定
- 需要精确控制通知顺序
- 性能要求高（避免事件中心的开销）

**用 PubSub 当：**
- 模块间需要完全解耦
- 不确定有多少订阅者
- 需要支持动态订阅/取消

---

## 第五步：进阶思考与面试加分点

### PubSub 可以看作 Observer 的进化版

PubSub 本质上是 Observer + 事件中心。事件中心做了两件事：**解耦**（切断直接依赖）和 **路由**（通过事件名分发消息）。

### 面试常见追问

**Q：如果让你设计一个消息队列，用哪种模式？**
A：PubSub。因为生产者和消费者完全解耦，且需要支持多对多通信。

**Q：如何防止内存泄漏？**
A：PubSub 组件销毁时调用 `off()` 取消所有订阅；Observer 调用 `unsubscribe()` 移除不再需要的观察者。

**Q：EventBus 和 Vuex/Redux 有什么关系？**
A：Vuex/Redux 本质上也是 PubSub 的变体，但增加了状态管理（单一数据源、mutation/action 等约束），比裸 EventBus 更可控。

### 一句话总结

> **Observer 是"我知道你在听"，PubSub 是"我对着空气说话，有人接就有人接"。**
