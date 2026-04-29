> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# 25 - 简易状态管理（类 Redux）

## 基本信息

- **分类**：设计模式与架构
- **难度**：⭐⭐⭐
- **考察点**：不可变更新、订阅发布、中间件、单一数据源

---

## 背景

Redux 是 React 生态中最经典的状态管理库，其核心思想影响了 Vuex、Pinia、Zustand 等众多方案。理解 Redux 的核心原理——**单一数据源、纯函数 reducer、不可变更新、订阅发布机制**——是掌握中大型应用状态管理的必备基础。

本题要求你从零实现一个迷你 Redux，深度理解状态管理的本质。

---

## 题目要求

实现 `createStore(reducer, initialState)` 工厂函数，返回的 store 对象需支持以下 API：

### 1. `getState()`

- 返回当前 state 的引用

### 2. `dispatch(action)`

- 接收一个 action 对象（必须包含 `type` 字段）
- 将当前 state 和 action 传递给 reducer，计算出新 state
- **要求 state 不可变更新**：reducer 必须返回新对象，而非修改原 state
- dispatch 完成后，通知所有已注册的订阅者

### 3. `subscribe(listener)`

- 注册一个监听函数，每次 dispatch 后自动调用
- 返回一个 `unsubscribe` 函数，调用后取消该监听
- 同一个 listener 不应被重复注册

### 4. `applyMiddleware(...middlewares)`（进阶）

- 实现中间件机制，支持在 dispatch 前后插入逻辑
- 中间件签名：`store => next => action => { ... }`
- 返回一个增强后的 `createStore` 函数（或等效的 store 创建方式）

---

## 示例

```javascript
// 定义 reducer
function counterReducer(state = { count: 0 }, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    case 'DECREMENT':
      return { ...state, count: state.count - 1 };
    default:
      return state;
  }
}

// 创建 store
const store = createStore(counterReducer);

// 订阅状态变化
const unsubscribe = store.subscribe(() => {
  console.log('State changed:', store.getState());
});

store.dispatch({ type: 'INCREMENT' });
// 输出: State changed: { count: 1 }

store.dispatch({ type: 'INCREMENT' });
// 输出: State changed: { count: 2 }

unsubscribe(); // 取消订阅

store.dispatch({ type: 'DECREMENT' });
// 无输出（已取消订阅）

console.log(store.getState()); // { count: 1 }
```

### 中间件示例

```javascript
// 日志中间件
const logger = store => next => action => {
  console.log('Dispatching:', action);
  const result = next(action);
  console.log('Next state:', store.getState());
  return result;
};

// thunk 中间件（支持 dispatch 函数）
const thunk = store => next => action => {
  if (typeof action === 'function') {
    return action(store.dispatch, store.getState);
  }
  return next(action);
};

const enhancedCreateStore = applyMiddleware(thunk, logger)(createStore);
const store = enhancedCreateStore(counterReducer);
```

---

## 约束与注意事项

1. **不可变更新**：reducer 必须返回全新对象，禁止直接修改原 state（`Object.assign` 或展开运算符）
2. **subscribe 返回值**：必须返回一个 unsubscribe 函数
3. **去重订阅**：同一个 listener 函数引用不应被重复添加
4. **中间件顺序**：`applyMiddleware(a, b, c)` 应按 a → b → c 的顺序增强 dispatch
5. **初始 dispatch**：store 创建时应自动 dispatch 一个初始化 action（如 `@@INIT`），使 reducer 返回默认 state
6. **默认 state**：若未提供 `initialState`，reducer 必须在 `default` 分支返回默认值（通过 `dispatch({ type: '@@INIT' })` 触发）
7. **空订阅安全**：dispatch 时若无任何 listener，不应报错，直接跳过通知阶段

---

## 评分标准

| 层级 | 要求 |
|------|------|
| **及格** | 正确实现 `getState`、`dispatch`、`subscribe`，理解不可变更新 |
| **良好** | subscribe 返回 unsubscribe 函数，处理去重，实现 `@@INIT` |
| **优秀** | 正确实现 `applyMiddleware`，理解中间件组合与洋葱模型 |
