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
├── observers: Set{Observer1, Observer2, ...}  ← 用 Set 自动去重
├── subscribe(observer)   → 添加到集合（重复添加无副作用）
├── unsubscribe(observer) → 从集合移除
└── notify(data)          → 遍历调用 observer.update(data)
```

### 前端应用

- **Vue 2 响应式**：data 属性通过 `Object.defineProperty` 劫持 → 触发 Dep → 通知 Watcher
- **RxJS**：Observable（Subject）通知 Subscriber（Observer）
- **DOM 事件**（部分）：addEventListener 注册的回调可视为观察者

### ⚠️ 内存泄漏注意

Observer 模式同样需要关注内存泄漏：如果 Subject 持有 Observer 引用但不再需要，必须调用 `unsubscribe()` 移除，否则 Observer 无法被 GC 回收。

---

## 第二步：理解发布订阅模式（PubSub Pattern）

### 核心概念

发布订阅模式在观察者模式基础上增加了一个**事件中心（EventBus）**作为中间层。发布者和订阅者完全解耦——它们互不知道对方的存在，只和事件中心打交道。

### 关键特征

- **完全解耦**：发布者不知道有多少订阅者，订阅者不知道谁是发布者
- **事件中心**：所有通信都通过 EventBus 转发
- **事件名驱动**：通过字符串事件名（如 `'user:login'`）匹配发布和订阅
- **无接口约束**：任何函数都能订阅，无需实现特定方法

### 类比

就像一个广播电台（EventBus）：电台（发布者）播出节目，听众（订阅者）调到对应频道收听。电台不知道有多少人在听，听众不知道是谁在播。

### 代码结构

```
Publisher ──emit(event, data)──→ EventBus ──callback(data)──→ Subscriber
                                  │
                                  ├── events: Map{ 'eventA' → [cb1, cb2], 'eventB' → [cb3] }
                                  ├── on(event, callback)   → 注册订阅
                                  ├── off(event, callback)  → 取消订阅
                                  ├── off(event)            → 清除该事件所有订阅
                                  ├── emit(event, ...args)  → 触发所有回调
                                  └── once(event, callback)  → 一次性订阅
```

### 前端应用

- **Node.js EventEmitter**：最经典的 PubSub 实现
- **Vue 事件总线**：`new Vue()` 作为 EventBus（Vue 2）
- **Redux**：Store.dispatch → Reducer → Subscriber
- **CustomEvent + EventTarget**：浏览器原生事件机制

### ⚠️ 内存泄漏注意

组件销毁时必须调用 `off()` 取消所有订阅，否则回调闭包持有外部引用导致内存泄漏。Vue 3 的 `onUnmounted` 钩子就是做这件事的。

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

### 耦合度的本质

- **Observer**：Subject 需要"知道"Observer 的存在和接口 → **紧耦合**
- **PubSub**：发布者只需知道事件名，不需要知道谁在听 → **松耦合**

---

## 第四步：实际场景分析

### 场景 1：为什么 Vue 2 用 Observer 模式？

Vue 2 的响应式系统中：
- `data` 中的每个属性通过 `Object.defineProperty` 劫持 getter/setter
- 每个依赖该属性的 Dep 管理一组 Watcher
- 属性变化时，Dep **直接调用** Watcher 的 `update` 方法

这适合 Vue 的场景，因为 watcher 数量有限且在编译时确定，直接调用效率更高。

### 场景 2：为什么 Node.js 用 PubSub 模式？

Node.js 的 EventEmitter 中：
- 服务器（发布者）发出 `request` 事件
- 各种中间件/处理器（订阅者）监听 `request` 事件
- 服务器不需要知道有哪些处理器

这适合 Node.js 的场景，因为处理器可能来自不同模块、不同包，无法预知。

### 场景 3：什么时候该用哪个？

**用 Observer 当：**
- 观察者数量少且稳定
- 需要精确控制通知顺序
- 性能要求高（避免事件中心的开销）
- 例：状态管理库的响应式系统

**用 PubSub 当：**
- 模块间需要完全解耦
- 不确定有多少订阅者
- 需要支持动态订阅/取消
- 例：跨组件通信、微前端间通信

### 决策速查

```
需要模块间解耦？──是──→ PubSub
       │
       否
       ↓
观察者数量固定？──是──→ Observer
       │
       否
       ↓
需要事件名分类？──是──→ PubSub
       │
       否
       ↓
     Observer
```

---

## 第五步：进阶思考与面试加分点

### 1. PubSub 可以看作 Observer 的进化版

PubSub 本质上是 Observer + 事件中心。事件中心做了两件事：
- **解耦**：切断 Subject 和 Observer 的直接依赖
- **路由**：通过事件名实现更灵活的消息分发

### 2. 实际框架中的混合使用

很多框架同时使用两种模式：

```javascript
// Vue 3 响应式（Observer 模式）
const state = reactive({ count: 0 });
watchEffect(() => console.log(state.count)); // 自动追踪依赖

// Vue 3 组件通信（PubSub 模式）
mitt.emit('update:sidebar');
mitt.on('update:sidebar', handler);
```

### 3. 面试常见追问

**Q：如果让你设计一个消息队列，用哪种模式？**
A：PubSub。因为生产者和消费者完全解耦，且需要支持多对多通信。

**Q：Observer 模式的 update 方法可以有多个参数吗？**
A：可以，但通常传递一个 data 对象更灵活，便于扩展。

**Q：如何防止内存泄漏？**
A：
- **PubSub**：组件销毁时调用 `off()` 取消所有订阅
- **Observer**：调用 `unsubscribe()` 移除不再需要的观察者
- Vue 3 中 `onUnmounted` 钩子就是做这件事的

**Q：EventBus 和 Vuex/Redux 有什么关系？**
A：Vuex/Redux 本质上也是 PubSub 的变体，但增加了状态管理（单一数据源、mutation/action 等约束），比裸 EventBus 更可控。

### 4. 一句话总结

> **Observer 是"我知道你在听"，PubSub 是"我对着空气说话，有人接就有人接"。**
