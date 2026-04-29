# 25 - 简易状态管理（类 Redux）题解

---

## 第一步：理解核心架构 —— 单一数据源

Redux 的第一个原则是**单一数据源**：整个应用的状态存储在一个对象树中（`currentState`），由一个 store 统一管理。

为什么强调"单一"？
- **可预测性**：所有状态集中一处，便于调试和时间旅行
- **数据一致性**：避免多个状态源导致的数据不同步
- **服务端渲染**：单一状态树容易序列化和水合

`getState()` 是最简单的 API——直接返回当前状态引用。但要注意：**在 reducer 执行期间禁止读取 state**，否则可能读到中间状态。

---

## 第二步：不可变更新 —— reducer 的核心约定

reducer 是一个**纯函数**：`(state, action) => newState`。关键约定是**不可变更新**——必须返回新对象，不能修改原 state。

```javascript
case 'INCREMENT':
  return { ...state, count: state.count + 1 };
```

为什么不可变？
1. **引用比较检测变化**：`oldState !== newState` 即可判断是否更新，无需深度对比
2. **时间旅行调试**：保留历史状态快照
3. **避免副作用**：纯函数保证可预测性

初始化时 `dispatch({ type: '@@INIT' })` 触发 reducer 返回默认 state，这是 Redux 的惯用手法。

---

## 第三步：逐步实现

### 3.1 createStore 核心

```javascript
function createStore(reducer, initialState) {
  let currentState = initialState;
  let listeners = [];
  let isDispatching = false;

  function getState() {
    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions or read state');
    }
    return currentState;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected the listener to be a function');
    }
    if (listeners.includes(listener)) {
      return () => {};
    }
    listeners.push(listener);
    let isSubscribed = true;
    return function unsubscribe() {
      if (!isSubscribed) return;
      isSubscribed = false;
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  }

  function dispatch(action) {
    if (typeof action !== 'object' || action === null) {
      throw new Error('Actions must be plain objects');
    }
    if (typeof action.type === 'undefined') {
      throw new Error('Actions may not have an undefined "type" property');
    }
    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions');
    }
    try {
      isDispatching = true;
      currentState = reducer(currentState, action);
    } finally {
      isDispatching = false;
    }
    const currentListeners = listeners.slice();
    for (let i = 0; i < currentListeners.length; i++) {
      currentListeners[i]();
    }
    return action;
  }

  dispatch({ type: '@@INIT' });

  return { getState, dispatch, subscribe };
}
```

**`isDispatching` 标志**：reducer 执行期间设置为 `true`，禁止嵌套 dispatch 和读取 state，保证数据一致性。

**`listeners.slice()` 快照**：通知订阅者前先快照当前列表，防止订阅者回调内增删 listener 导致遍历异常。

**`@@INIT` 初始化**：store 创建时自动 dispatch，触发 reducer 返回默认 state。

**subscribe 返回 unsubscribe 函数**：闭包机制捕获 listener 引用，调用者无需记住索引。`isSubscribed` 标志防止重复取消。

### 3.2 compose — 函数组合

```javascript
function compose(...funcs) {
  if (funcs.length === 0) return (arg) => arg;
  if (funcs.length === 1) return funcs[0];

  return funcs.reduce(
    (a, b) =>
      (...args) =>
        a(b(...args))
  );
}
```

`compose(f, g, h)` 等价于 `(...args) => f(g(h(...args)))`，从右到左组合。这是中间件洋葱模型的基础。

### 3.3 applyMiddleware — 中间件机制

```javascript
function applyMiddleware(...middlewares) {
  return function (createStoreFn) {
    return function (reducer, initialState) {
      const store = createStoreFn(reducer, initialState);

      let dispatch = () => {
        throw new Error('Dispatching while constructing your middleware is not allowed');
      };

      const middlewareAPI = {
        getState: store.getState,
        dispatch: (action, ...args) => dispatch(action, ...args),
      };

      const chain = middlewares.map((middleware) => middleware(middlewareAPI));
      dispatch = compose(...chain)(store.dispatch);

      return { ...store, dispatch };
    };
  };
}
```

**中间件签名**：`store => next => action => { ... }`。每个中间件接收 store API，返回一个包装 dispatch 的函数。

**占位 dispatch**：先用抛异常的占位函数，避免中间件构造期间调用 dispatch。等中间件组合完成后才赋值真实 dispatch。

**洋葱模型**：`compose(A, B, C)(store.dispatch)` 形成 `A → B → C → 原始 dispatch` 的调用链，每个中间件可以在 `next(action)` 前后插入逻辑。

---

## 第四步：常见追问

**Q: 如何实现 combineReducers？**

将多个 reducer 拆分合并，每个管理 state 树的一个分支。dispatch 时遍历所有 reducer，各自更新自己负责的子状态。

**Q: Redux Toolkit 如何简化？**

使用 Immer 实现"看起来可变、实际不可变"的简化写法，开发者直接 `state.count++`，Immer 内部处理不可变更新。

**Q: 中间件的执行顺序？**

`applyMiddleware(a, b, c)` 按 a → b → c 的顺序增强 dispatch。dispatch 时 action 先经过 a，再经过 b，最后经过 c。

**Q: action 为什么必须是普通对象？**

普通对象可序列化、可预测、可被中间件拦截和记录。Redux 的 thunk 中间件通过拦截函数类型的 action 来"绕过"这一限制。

---

## 第五步：易错点

| 易错点 | 说明 |
|-------|------|
| reducer 直接修改原 state | 必须返回新对象，用展开运算符或 `Object.assign` |
| subscribe 不返回 unsubscribe | 调用者无法取消订阅，导致内存泄漏 |
| dispatch 时通知订阅者不快照 | 订阅者内增删 listener 会导致遍历异常 |
| 中间件占位 dispatch 未替换 | 中间件组合完成后必须赋值真实 dispatch |
| 忘记 `@@INIT` 初始化 | reducer 的 default 分支不会被触发，初始状态为 undefined |
