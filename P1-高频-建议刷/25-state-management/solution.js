/**
 * 简易状态管理 - 类 Redux 实现
 * 考察：不可变更新、订阅发布、中间件、单一数据源
 */

// ==================== createStore 核心实现 ====================

function createStore(reducer, initialState) {
  // 当前状态（单一数据源）
  let currentState = initialState;
  // 订阅者列表
  let listeners = [];
  // 是否正在 dispatch 中（防止在 reducer 里再次 dispatch）
  let isDispatching = false;

  // --- 获取当前状态 ---
  function getState() {
    // dispatch 过程中不允许读取 state，保证数据一致性
    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions or read state');
    }
    return currentState;
  }

  // --- 注册订阅，返回取消订阅函数 ---
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected the listener to be a function');
    }

    // 去重：同一个引用不重复注册
    if (listeners.includes(listener)) {
      return () => {}; // 返回空函数，不做任何事
    }

    listeners.push(listener);

    // 返回 unsubscribe 函数（闭包保留 listener 引用）
    let isSubscribed = true;
    return function unsubscribe() {
      if (!isSubscribed) return; // 防止重复取消
      isSubscribed = false;
      // 从数组中移除该 listener
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  // --- 派发 action，触发状态更新 + 通知订阅者 ---
  function dispatch(action) {
    // action 必须是普通对象且包含 type
    if (typeof action !== 'object' || action === null) {
      throw new Error('Actions must be plain objects');
    }
    if (typeof action.type === 'undefined') {
      throw new Error('Actions may not have an undefined "type" property');
    }

    // reducer 执行期间禁止嵌套 dispatch
    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions');
    }

    try {
      isDispatching = true;
      // 核心：调用 reducer 计算新 state（纯函数，不可变更新）
      currentState = reducer(currentState, action);
    } finally {
      isDispatching = false;
    }

    // 通知所有订阅者（快照当前列表，防止订阅者内增删导致问题）
    const currentListeners = listeners.slice();
    for (let i = 0; i < currentListeners.length; i++) {
      currentListeners[i]();
    }

    return action;
  }

  // --- 替换 reducer（用于代码热更新等场景） ---
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function');
    }
    reducer = nextReducer;
    // 替换后立即 dispatch 一次，让新 reducer 初始化
    dispatch({ type: '@@REPLACE' });
  }

  // 初始化：dispatch 一个 INIT action，让 reducer 返回默认 state
  dispatch({ type: '@@INIT' });

  return {
    getState,
    dispatch,
    subscribe,
    replaceReducer,
  };
}


// ==================== applyMiddleware 中间件机制 ====================

/**
 * applyMiddleware 的核心思想：洋葱模型
 * 中间件签名：store => next => action => { ... }
 * 通过 compose 将多个中间件串联，形成 dispatch 增强链
 */
function applyMiddleware(...middlewares) {
  // 返回一个高阶函数，接收 createStore
  return function (createStoreFn) {
    return function (reducer, initialState) {
      // 先用原始 createStore 创建 store
      const store = createStoreFn(reducer, initialState);

      // 给每个中间件注入 store（但此时 dispatch 还是原始的）
      // 为了避免循环依赖，先用一个占位 dispatch
      let dispatch = () => {
        throw new Error(
          'Dispatching while constructing your middleware is not allowed'
        );
      };

      const middlewareAPI = {
        getState: store.getState,
        dispatch: (action, ...args) => dispatch(action, ...args),
      };

      // 每个中间件接收 store，返回 next => action => {...}
      const chain = middlewares.map((middleware) => middleware(middlewareAPI));

      // 用 compose 组合中间件链，增强 dispatch
      dispatch = compose(...chain)(store.dispatch);

      return {
        ...store,
        dispatch, // 返回增强后的 dispatch
      };
    };
  };
}

/**
 * compose 函数：从右到左组合函数
 * compose(f, g, h) => (...args) => f(g(h(...args)))
 * 这是中间件洋葱模型的关键
 */
function compose(...funcs) {
  if (funcs.length === 0) return (arg) => arg;
  if (funcs.length === 1) return funcs[0];

  return funcs.reduce(
    (a, b) =>
      (...args) =>
        a(b(...args))
  );
}


// ==================== 测试用例 ====================

// --- 基础测试 ---
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

const store = createStore(counterReducer);

// 订阅
const log1 = () => console.log('[Listener 1] State:', store.getState());
const unsubscribe1 = store.subscribe(log1);

store.dispatch({ type: 'INCREMENT' }); // count: 1
store.dispatch({ type: 'ADD', payload: 5 }); // count: 6

unsubscribe1(); // 取消订阅
store.dispatch({ type: 'DECREMENT' }); // count: 5（无日志输出）

console.log('Final state:', store.getState()); // { count: 5 }

// --- 中间件测试 ---
const logger = (store) => (next) => (action) => {
  console.log('[Logger] Dispatching:', action.type);
  const result = next(action);
  console.log('[Logger] Next state:', store.getState());
  return result;
};

// 注意：applyMiddleware 返回增强的 createStore，需重新创建 store
// 中间件 store 的 state 从 reducer 默认值开始（新实例）
const enhancedStore = applyMiddleware(logger)(createStore)(counterReducer);
enhancedStore.dispatch({ type: 'INCREMENT' }); // { count: 1 }
enhancedStore.dispatch({ type: 'ADD', payload: 10 }); // { count: 11 }
