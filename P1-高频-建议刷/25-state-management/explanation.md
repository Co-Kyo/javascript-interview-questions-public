# 25 - 简易状态管理（类 Redux）题解

---

## 第一步：理解核心架构 —— 单一数据源

Redux 的第一个原则是**单一数据源**：整个应用的状态存储在一个对象树中（`currentState`），由一个 store 统一管理。

```javascript
let currentState = initialState;
```

为什么强调"单一"？
- **可预测性**：所有状态集中一处，便于调试和时间旅行
- **数据一致性**：避免多个状态源导致的数据不同步
- **服务端渲染**：单一状态树容易序列化和水合

`getState()` 是最简单的 API——直接返回当前状态引用。但要注意：**在 reducer 执行期间禁止读取 state**，否则可能读到中间状态。

---

## 第二步：不可变更新 —— reducer 的核心约定

reducer 是一个**纯函数**：`(state, action) => newState`。关键约定是**不可变更新**——必须返回新对象，不能修改原 state。

```javascript
// ✅ 正确：展开运算符创建新对象
case 'INCREMENT':
  return { ...state, count: state.count + 1 };

// ❌ 错误：直接修改原对象
case 'INCREMENT':
  state.count += 1;
  return state;
```

为什么不可变？
1. **引用比较检测变化**：`oldState !== newState` 即可判断是否更新，无需深度对比
2. **时间旅行调试**：保留历史状态快照
3. **避免副作用**：纯函数保证可预测性

初始化时 `dispatch({ type: '@@INIT' })` 触发 reducer 返回默认 state，这是 Redux 的惯用手法。

> **为什么 action 必须是普通对象？** 普通对象可序列化、可预测、可被中间件拦截和记录。如果允许函数或 Symbol 等特殊类型，中间件的日志记录、时间旅行调试、序列化存储等机制将失效。Redux 的 thunk 中间件正是通过拦截函数类型的 action 来"绕过"这一限制的。

---

## 第三步：订阅发布 —— 响应状态变化

subscribe 实现了经典的**观察者模式**：

```javascript
function subscribe(listener) {
  // 类型校验：必须是函数
  if (typeof listener !== 'function') {
    throw new Error('Expected the listener to be a function');
  }

  // 去重：同一引用不重复注册
  if (listeners.includes(listener)) {
    return () => {}; // 已注册则返回空函数
  }

  listeners.push(listener);

  // 返回 unsubscribe 函数（闭包机制）
  let isSubscribed = true;
  return function unsubscribe() {
    if (!isSubscribed) return;
    isSubscribed = false;
    const index = listeners.indexOf(listener);
    if (index > -1) listeners.splice(index, 1);
  };
}
```

关键设计点：
1. **闭包返回 unsubscribe**：调用者无需记住自己的索引，闭包自动捕获 listener 引用
2. **防重复取消**：`isSubscribed` 标志防止 splice 出错
3. **快照通知**：dispatch 时用 `listeners.slice()` 快照当前列表，避免订阅者内增删导致遍历异常
4. **去重注册**：同一个 listener 引用不重复添加

---

## 第四步：applyMiddleware —— 洋葱模型与函数组合

中间件是 Redux 最精妙的设计。中间件签名：

```javascript
store => next => action => { /* 前置逻辑 */ const result = next(action); /* 后置逻辑 */ return result; }
```

**理解洋葱模型**：

假设中间件链为 `[A, B, C]`，原始 dispatch 为 `D`，则组合后：

```
dispatch(action)
  → A 接收 action
    → B 接收 action
      → C 接收 action
        → D(action) 真正执行 reducer
      → C 后置逻辑
    → B 后置逻辑
  → A 后置逻辑
```

**compose 函数**是实现的关键：

```javascript
function compose(...funcs) {
  if (funcs.length === 0) return (arg) => arg; // 空组合：恒等函数
  if (funcs.length === 1) return funcs[0];     // 单函数：直接返回

  return funcs.reduce((a, b) => (...args) => a(b(...args)));
}
```

`compose(A, B, C)` 等价于 `(...args) => A(B(C(...args)))`，从右到左组合。

**middlewareAPI 的陷阱**：先用占位 dispatch 避免循环依赖，等中间件组合完成后再赋值真实 dispatch。

---

## 第五步：实际应用与进阶思考

### 常见中间件

| 中间件 | 作用 |
|--------|------|
| **logger** | 打印 action 和 state 变化，开发调试 |
| **thunk** | 支持 dispatch 函数，实现异步操作 |
| **promise** | 支持 dispatch Promise，自动 resolve |
| **redux-saga** | 用 Generator/async 管理副作用 |

### 与现代方案对比

| 特性 | Redux | Zustand | Pinia |
|------|-------|---------|-------|
| 模板代码 | 多（action/reducer） | 极少 | 少 |
| 不可变更新 | 必须 | 内部处理 | 响应式 |
| 中间件 | 完善 | 中间件/插件 | 插件 |
| 学习曲线 | 陡 | 平缓 | 平缓 |

### 面试加分点

1. **时间旅行调试**的原理：保存 state 快照数组 + 重放 action
2. **combineReducers**：将多个 reducer 拆分合并，每个管理 state 树的一个分支
3. **Redux Toolkit (RTK)**：Immer 实现"看起来可变、实际不可变"的简化写法
4. **发布订阅的变体**：RxJS 的 Observable 模式、MobX 的响应式追踪
