const EventEmitter = require('./solution.js');

// 基本 on + emit
const emitter = new EventEmitter();
let result = '';
emitter.on('test', (msg) => { result = msg; });
emitter.emit('test', 'hello');
console.assert(result === 'hello', 'on + emit 基本功能');

// 多个监听器按顺序执行
const order = [];
emitter.on('multi', () => order.push(1));
emitter.on('multi', () => order.push(2));
emitter.emit('multi');
console.assert(order[0] === 1 && order[1] === 2, '多个监听器按注册顺序执行');

// off 精确移除
const em2 = new EventEmitter();
let count = 0;
const handler = () => { count++; };
em2.on('click', handler);
em2.emit('click');
em2.off('click', handler);
em2.emit('click');
console.assert(count === 1, 'off 移除后不再触发');

// off 移除不存在的监听器（不报错）
em2.off('click', () => {});
console.assert(true, 'off 不存在的监听器不报错');

// off 不存在的事件（不报错）
em2.off('nonexistent', () => {});
console.assert(true, 'off 不存在的事件不报错');

// emit 未注册的事件返回 false
const em3 = new EventEmitter();
console.assert(em3.emit('nope') === false, 'emit 未注册事件返回 false');

// once 只触发一次
const em4 = new EventEmitter();
let onceCount = 0;
em4.once('click', () => { onceCount++; });
em4.emit('click');
em4.emit('click');
console.assert(onceCount === 1, 'once 只触发一次');

// once + off 通过原始函数移除
const em5 = new EventEmitter();
let onceResult = false;
const onceFn = () => { onceResult = true; };
em5.once('test', onceFn);
em5.off('test', onceFn);
em5.emit('test');
console.assert(onceResult === false, 'once 注册的监听器可通过原始函数 off 移除');

// once 回调中 this 指向正确
const em6 = new EventEmitter();
let thisCorrect = false;
em6.once('check', function() {
  thisCorrect = (this === em6);
});
em6.emit('check');
console.assert(thisCorrect === true, 'once 回调中 this 指向 emitter');

// emit 传递多个参数
const em7 = new EventEmitter();
let params = [];
em7.on('data', (a, b, c) => { params = [a, b, c]; });
em7.emit('data', 1, 2, 3);
console.assert(params[0] === 1 && params[1] === 2 && params[2] === 3, 'emit 传递多个参数');

// 回调中 off 当前事件不影响遍历
const em8 = new EventEmitter();
const results = [];
em8.on('safe', () => { results.push('a'); });
em8.on('safe', () => { results.push('b'); em8.off('safe', arguments.callee); });
em8.on('safe', () => { results.push('c'); });
em8.emit('safe');
console.assert(results.length === 3 && results.join('') === 'abc', '回调中 off 不影响当前遍历');

// removeAllListeners 指定事件
const em9 = new EventEmitter();
em9.on('a', () => {});
em9.on('b', () => {});
em9.removeAllListeners('a');
console.assert(em9.listenerCount('a') === 0 && em9.listenerCount('b') === 1, 'removeAllListeners 指定事件');

// removeAllListeners 不传参数清除所有
em9.removeAllListeners();
console.assert(em9.listenerCount('b') === 0, 'removeAllListeners 不传参数清除所有');

// listenerCount
const em10 = new EventEmitter();
em10.on('x', () => {});
em10.on('x', () => {});
console.assert(em10.listenerCount('x') === 2, 'listenerCount 返回正确数量');
console.assert(em10.listenerCount('y') === 0, 'listenerCount 未注册事件返回 0');

// eventNames
const em11 = new EventEmitter();
em11.on('a', () => {});
em11.on('b', () => {});
const names = em11.eventNames();
console.assert(names.length === 2 && names.includes('a') && names.includes('b'), 'eventNames 返回所有事件名');

// 链式调用
const em12 = new EventEmitter();
const ret = em12.on('x', () => {}).on('y', () => {});
console.assert(ret === em12, 'on 支持链式调用');

console.log('✅ 全部通过');
