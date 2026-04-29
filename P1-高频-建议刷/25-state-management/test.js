/**
 * 25 - 简易状态管理（类 Redux）— 测试
 * 运行：node test.js
 */

const { createStore, applyMiddleware, compose } = require('./solution.js');

// --- 辅助 ---

function counterReducer(state = { count: 0 }, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    case 'DECREMENT':
      return { ...state, count: state.count - 1 };
    case 'ADD':
      return { ...state, count: state.count + action.payload };
    default:
      return state;
  }
}

// --- createStore 基础功能 ---

const store = createStore(counterReducer);
console.assert(store.getState().count === 0, '初始状态通过 @@INIT 设置');

// dispatch
store.dispatch({ type: 'INCREMENT' });
console.assert(store.getState().count === 1, 'dispatch INCREMENT');

store.dispatch({ type: 'ADD', payload: 5 });
console.assert(store.getState().count === 6, 'dispatch ADD with payload');

// subscribe
let callCount = 0;
const listener = () => { callCount++; };
const unsubscribe = store.subscribe(listener);

store.dispatch({ type: 'INCREMENT' });
console.assert(callCount === 1, 'subscribe 回调被调用');
console.assert(store.getState().count === 7, '状态正确更新');

// unsubscribe
unsubscribe();
store.dispatch({ type: 'DECREMENT' });
console.assert(callCount === 1, 'unsubscribe 后不再调用');
console.assert(store.getState().count === 6, '状态仍然正确更新');

// 去重订阅
let dupCount = 0;
const dupListener = () => { dupCount++; };
store.subscribe(dupListener);
store.subscribe(dupListener);
store.dispatch({ type: 'INCREMENT' });
console.assert(dupCount === 1, '同一 listener 不重复注册');

// dispatch 返回 action
const result = store.dispatch({ type: 'INCREMENT' });
console.assert(result.type === 'INCREMENT', 'dispatch 返回 action');

// --- 不可变更新验证 ---

const stateBefore = store.getState();
store.dispatch({ type: 'INCREMENT' });
const stateAfter = store.getState();
console.assert(stateBefore !== stateAfter, 'reducer 返回新对象（不可变更新）');

// --- 错误处理 ---

try {
  store.dispatch('not-an-object');
  console.assert(false, '非对象 action 应抛错');
} catch (e) {
  console.assert(e.message.includes('plain objects'), '非对象 action 抛正确错误');
}

try {
  store.dispatch({ noType: true });
  console.assert(false, '无 type 的 action 应抛错');
} catch (e) {
  console.assert(e.message.includes('type'), '无 type 抛正确错误');
}

try {
  store.subscribe('not-a-function');
  console.assert(false, '非函数 listener 应抛错');
} catch (e) {
  console.assert(e.message.includes('function'), '非函数 listener 抛正确错误');
}

// --- 快照通知（订阅者内增删不影响当次通知）---

const store2 = createStore(counterReducer);
const events = [];
const detachA = store2.subscribe(() => {
  events.push('A');
  detachA();
});
store2.subscribe(() => {
  events.push('B');
});
store2.dispatch({ type: 'INCREMENT' });
console.assert(events.length === 2, '快照通知：两个 listener 都被调用');
console.assert(events[0] === 'A', '快照通知：A 先执行');
console.assert(events[1] === 'B', '快照通知：B 后执行');

// --- compose ---

const add1 = (x) => x + 1;
const mul2 = (x) => x * 2;
const composed = compose(add1, mul2);
console.assert(composed(3) === 7, 'compose: add1(mul2(3)) = 7');

const identity = compose();
console.assert(identity(42) === 42, 'compose 空参数返回恒等函数');

const single = compose(add1);
console.assert(single(5) === 6, 'compose 单参数直接返回');

// --- applyMiddleware ---

const enhancedStore = applyMiddleware()(createStore)(counterReducer);
enhancedStore.dispatch({ type: 'INCREMENT' });
console.assert(enhancedStore.getState().count === 1, '无中间件时 dispatch 正常工作');

// logger 中间件
const loggerActions = [];
const logger = (store) => (next) => (action) => {
  loggerActions.push(action.type);
  return next(action);
};

const storeWithLogger = applyMiddleware(logger)(createStore)(counterReducer);
storeWithLogger.dispatch({ type: 'INCREMENT' });
storeWithLogger.dispatch({ type: 'ADD', payload: 10 });
console.assert(loggerActions.length === 2, '中间件：logger 收到 2 个 action');
console.assert(loggerActions[0] === 'INCREMENT', '中间件：第一个 action 正确');
console.assert(loggerActions[1] === 'ADD', '中间件：第二个 action 正确');
console.assert(storeWithLogger.getState().count === 11, '中间件：状态正确更新');

console.log('✅ 全部通过');
