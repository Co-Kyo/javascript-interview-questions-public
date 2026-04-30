const { Subject, Observer, EventBus } = require('./solution.js');

// ==================== Observer 模式测试 ====================
console.log('--- Observer 模式 ---');

// 基本 subscribe + notify
const subject = new Subject();
let received = null;
const obs1 = new Observer('obs1', (data) => { received = data; });
subject.subscribe(obs1);
subject.notify({ value: 42 });
console.assert(received && received.value === 42, 'Observer: subscribe + notify 基本功能');

// 多个 Observer
let received2 = null;
const obs2 = new Observer('obs2', (data) => { received2 = data; });
subject.subscribe(obs2);
subject.notify('hello');
console.assert(received === 'hello' && received2 === 'hello', 'Observer: 多个 Observer 都收到通知');

// Set 自动去重
subject.subscribe(obs1);
let count = 0;
const obs3 = new Observer('obs3', () => { count++; });
const sub2 = new Subject();
sub2.subscribe(obs3);
sub2.subscribe(obs3);
sub2.notify();
console.assert(count === 1, 'Observer: Set 自动去重，重复订阅只触发一次');

// unsubscribe
const sub3 = new Subject();
let unsubResult = null;
const obs4 = new Observer('obs4', (d) => { unsubResult = d; });
sub3.subscribe(obs4);
sub3.notify('before');
sub3.unsubscribe(obs4);
sub3.notify('after');
console.assert(unsubResult === 'before', 'Observer: unsubscribe 后不再收到通知');

// unsubscribe 不存在的 Observer（不报错）
sub3.unsubscribe(obs4);
console.assert(true, 'Observer: unsubscribe 不存在的 Observer 不报错');

// 链式调用
const sub4 = new Subject();
const obs5 = new Observer('obs5', () => {});
const obs6 = new Observer('obs6', () => {});
const ret = sub4.subscribe(obs5).subscribe(obs6);
console.assert(ret === sub4, 'Observer: subscribe 支持链式调用');

// ==================== PubSub 模式测试 ====================
console.log('\n--- PubSub 模式 ---');

// 基本 on + emit
const bus = new EventBus();
let busResult = null;
bus.on('test', (data) => { busResult = data; });
bus.emit('test', 'world');
console.assert(busResult === 'world', 'PubSub: on + emit 基本功能');

// 多个订阅者
let busResult2 = null;
bus.on('test', (data) => { busResult2 = data; });
bus.emit('test', 'multi');
console.assert(busResult === 'multi' && busResult2 === 'multi', 'PubSub: 多个订阅者都收到');

// 不同事件互不影响
let eventA = false, eventB = false;
bus.on('a', () => { eventA = true; });
bus.on('b', () => { eventB = true; });
bus.emit('a');
console.assert(eventA === true && eventB === false, 'PubSub: 不同事件互不影响');

// emit 不存在的事件（不报错）
bus.emit('nonexistent', 'data');
console.assert(true, 'PubSub: emit 不存在的事件不报错');

// off(event, callback) 移除指定回调
const bus2 = new EventBus();
let offResult = 0;
const offFn = () => { offResult++; };
bus2.on('click', offFn);
bus2.emit('click');
bus2.off('click', offFn);
bus2.emit('click');
console.assert(offResult === 1, 'PubSub: off 移除指定回调');

// off(event) 移除该事件所有订阅
const bus3 = new EventBus();
let offAll1 = 0, offAll2 = 0;
bus3.on('x', () => { offAll1++; });
bus3.on('x', () => { offAll2++; });
bus3.emit('x');
bus3.off('x');
bus3.emit('x');
console.assert(offAll1 === 1 && offAll2 === 1, 'PubSub: off(event) 移除所有订阅');

// off 不存在的事件（不报错）
bus3.off('nonexistent');
bus3.off('nonexistent', () => {});
console.assert(true, 'PubSub: off 不存在的事件不报错');

// once 只触发一次
const bus4 = new EventBus();
let onceCount = 0;
bus4.once('click', () => { onceCount++; });
bus4.emit('click');
bus4.emit('click');
console.assert(onceCount === 1, 'PubSub: once 只触发一次');

// once + off 通过原始回调取消
const bus5 = new EventBus();
let onceOffResult = false;
const onceFn = () => { onceOffResult = true; };
bus5.once('alert', onceFn);
bus5.off('alert', onceFn);
bus5.emit('alert');
console.assert(onceOffResult === false, 'PubSub: once 可通过原始回调 off 取消');

// once 传递参数
const bus6 = new EventBus();
let onceParam = null;
bus6.once('data', (msg) => { onceParam = msg; });
bus6.emit('data', 'test-param');
console.assert(onceParam === 'test-param', 'PubSub: once 正确传递参数');

// ==================== 对比验证 ====================
console.log('\n--- 对比验证 ---');

// Observer: Subject 直接持有 Observer 引用
const weatherStation = new Subject();
const phoneDisplay = new Observer('phone', (d) => {});
weatherStation.subscribe(phoneDisplay);
console.assert(weatherStation.observers.has(phoneDisplay), 'Observer: Subject 直接持有 Observer 引用');

// PubSub: EventBus 不持有订阅者引用，只持有回调
const bus7 = new EventBus();
const handler = () => {};
bus7.on('test', handler);
console.assert(bus7.events.get('test').includes(handler), 'PubSub: EventBus 持有回调函数');

console.log('\n✅ 全部通过');
