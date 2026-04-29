// ============================================================
// 观察者模式 vs 发布订阅模式 - 实现与对比
// ============================================================

// ==================== Observer 模式 ====================
// 核心特征：Subject 直接持有 Observer 引用，主动调用 update()
// 耦合关系：Subject ←→ Observer（直接耦合）

class Subject {
  constructor() {
    this.observers = new Set(); // 用 Set 自动去重，O(1) 查找
  }

  // 添加观察者（自动去重）
  subscribe(observer) {
    if (typeof observer !== 'object' || typeof observer.update !== 'function') {
      throw new TypeError('Observer must be an object with an update() method');
    }
    this.observers.add(observer);
    return this; // 支持链式调用
  }

  // 移除观察者
  unsubscribe(observer) {
    this.observers.delete(observer);
    return this;
  }

  // 通知所有观察者 —— Subject 直接调用 Observer 的 update 方法
  // 使用 [...this.observers] 快照，避免 notify 期间修改集合导致跳过元素
  notify(data) {
    for (const observer of [...this.observers]) {
      observer.update(data);
    }
  }
}

class Observer {
  constructor(name, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Observer callback must be a function');
    }
    this.name = name;
    this.callback = callback;
  }

  // 被 Subject 直接调用的更新方法
  update(data) {
    this.callback(data);
  }
}

// ==================== PubSub 模式 ====================
// 核心特征：发布者和订阅者完全解耦，通过事件中心通信
// 耦合关系：Publisher → EventBus ← Subscriber（无直接耦合）

class EventBus {
  constructor() {
    this.events = new Map(); // 事件名 → 回调列表 的映射
  }

  // 订阅事件（注册回调）
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('EventBus.on() callback must be a function');
    }
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
    return this;
  }

  // 取消订阅
  // - off(event, callback): 移除指定回调
  // - off(event): 移除该事件所有订阅
  off(event, callback) {
    if (!this.events.has(event)) return this;
    if (callback) {
      const filtered = this.events.get(event).filter(
        cb => cb !== callback && cb._original !== callback
      );
      if (filtered.length === 0) {
        this.events.delete(event);
      } else {
        this.events.set(event, filtered);
      }
    } else {
      this.events.delete(event);
    }
    return this;
  }

  // 发布事件（触发所有订阅回调）
  emit(event, ...args) {
    if (!this.events.has(event)) return;
    // 使用快照遍历，避免回调中 off 导致跳过元素
    for (const callback of [...this.events.get(event)]) {
      callback(...args);
    }
  }

  // 一次性订阅
  once(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('EventBus.once() callback must be a function');
    }
    const wrapper = (...args) => {
      callback(...args);
      this.off(event, wrapper);
    };
    // 保存原始回调引用，支持 off(event, callback) 取消 once 订阅
    wrapper._original = callback;
    this.on(event, wrapper);
    return this;
  }
}

// ============================================================
// 对比演示
// ============================================================

console.log('===== Observer 模式演示 =====');

// Observer 模式：Subject 直接管理 Observer
const weatherStation = new Subject();

const phoneDisplay = new Observer('手机显示', (data) => {
  console.log(`[手机显示] 温度更新: ${data.temperature}°C`);
});

const windowDisplay = new Observer('窗口显示', (data) => {
  console.log(`[窗口显示] 温度更新: ${data.temperature}°C`);
});

// Subject 直接持有 Observer 引用
weatherStation.subscribe(phoneDisplay).subscribe(windowDisplay);

// 重复订阅测试 —— Set 自动去重，不会重复通知
weatherStation.subscribe(phoneDisplay);
console.log('（重复订阅 phoneDisplay，应只收到一次通知）');

// Subject 状态变化 → 直接通知 Observer
console.log('天气站更新数据...');
weatherStation.notify({ temperature: 28 });
weatherStation.notify({ temperature: 32 });

// 取消订阅测试
console.log('\n取消 phoneDisplay 订阅...');
weatherStation.unsubscribe(phoneDisplay);
weatherStation.notify({ temperature: 25 });

console.log('\n===== PubSub 模式演示 =====');

// PubSub 模式：发布者和订阅者完全解耦
const eventBus = new EventBus();

// 订阅者 A：不知道谁会发布事件
eventBus.on('user:login', (user) => {
  console.log(`[日志模块] 用户登录: ${user.name}`);
});

// 订阅者 B：同样不知道发布者是谁
eventBus.on('user:login', (user) => {
  console.log(`[通知模块] 欢迎回来, ${user.name}!`);
});

// 订阅者 C：订阅不同事件
eventBus.on('order:created', (order) => {
  console.log(`[订单模块] 新订单: ${order.id}, 金额: ${order.amount}元`);
});

// 发布者：只管发布，不知道谁在监听
console.log('用户登录事件...');
eventBus.emit('user:login', { name: 'Alice', role: 'admin' });

console.log('创建订单事件...');
eventBus.emit('order:created', { id: 'ORD-001', amount: 299 });

// 边界：触发不存在的事件（静默处理）
console.log('\n触发不存在的事件...');
eventBus.emit('nonexistent', 'data');

console.log('\n===== once 演示 =====');

eventBus.once('notification', (msg) => {
  console.log(`[一次性通知] ${msg}`);
});

eventBus.emit('notification', '这会被打印');
eventBus.emit('notification', '这不会被打印（已自动取消订阅）');

// once + off 测试：提前取消 once 订阅
console.log('\n===== once + off 测试 =====');
const onceHandler = (msg) => console.log(`[不应执行] ${msg}`);
eventBus.once('alert', onceHandler);
eventBus.off('alert', onceHandler); // 通过原始回调取消 once 订阅
eventBus.emit('alert', '这不应被打印（once 已被 off 取消）');
console.log('（上面无输出说明 off 成功取消了 once 订阅）');

// ============================================================
// 核心区别总结
// ============================================================
console.log('\n===== 核心区别 =====');
console.log(`
1. 耦合关系：
   Observer: Subject 直接持有 Observer 引用，调用 observer.update()
   PubSub:   发布者和订阅者互不知道对方，完全通过 EventBus 通信

2. 中间层：
   Observer: 没有中间层，Subject 直接通知 Observer
   PubSub:   有 EventBus 作为中间层转发消息

3. 灵活性：
   Observer: Observer 必须实现 update() 接口
   PubSub:   任何函数都能通过 on() 订阅，无需实现特定接口

4. 事件粒度：
   Observer: Subject 通知所有 Observer，无事件名区分
   PubSub:   通过事件名区分不同事件类型，支持更细粒度的订阅

5. 典型应用：
   Observer: Vue 2 响应式 (data → watcher)、RxJS Observable
   PubSub:   Node.js EventEmitter、Vue 事件总线、Redux Store
`);
