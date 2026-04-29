> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# 25 - 简易状态管理（类 Redux）

## 基本信息

| 项目 | 内容 |
|------|------|
| 分类 | 设计模式与架构 |
| 难度 | ⭐⭐⭐ |
| 考察点 | 不可变更新、订阅发布、中间件、单一数据源 |

## 背景

Redux 是 React 生态中最经典的状态管理库，其核心思想影响了 Vuex、Pinia、Zustand 等众多方案。本题要求从零实现一个迷你 Redux，深度理解状态管理的本质。

## 题目要求

实现 `createStore(reducer, initialState)` 工厂函数，返回的 store 对象需支持：

### 1. `getState()`
返回当前 state 的引用

### 2. `dispatch(action)`
接收包含 `type` 字段的 action 对象，调用 reducer 计算新 state，通知所有订阅者。reducer 必须返回新对象（不可变更新）

### 3. `subscribe(listener)`
注册监听函数，每次 dispatch 后自动调用。返回 `unsubscribe` 函数。同一 listener 不应重复注册

### 4. `applyMiddleware(...middlewares)`（进阶）
中间件签名：`store => next => action => { ... }`。返回增强后的 `createStore` 函数

## 示例

```javascript
function counterReducer(state = { count: 0 }, action) {
  switch (action.type) {
    case 'INCREMENT': return { ...state, count: state.count + 1 };
    case 'DECREMENT': return { ...state, count: state.count - 1 };
    default: return state;
  }
}

const store = createStore(counterReducer);
const unsubscribe = store.subscribe(() => console.log(store.getState()));

store.dispatch({ type: 'INCREMENT' }); // → { count: 1 }
store.dispatch({ type: 'INCREMENT' }); // → { count: 2 }
unsubscribe();
store.dispatch({ type: 'DECREMENT' }); // 无输出
console.log(store.getState());          // { count: 1 }
```

### 中间件示例

```javascript
const logger = store => next => action => {
  console.log('Dispatching:', action);
  const result = next(action);
  console.log('Next state:', store.getState());
  return result;
};

const enhancedCreateStore = applyMiddleware(logger)(createStore);
const store = enhancedCreateStore(counterReducer);
```

## 约束

1. reducer 必须返回全新对象，禁止直接修改原 state
2. subscribe 必须返回 unsubscribe 函数
3. store 创建时自动 dispatch 初始化 action（`@@INIT`）
4. `applyMiddleware(a, b, c)` 按 a → b → c 的顺序增强 dispatch
