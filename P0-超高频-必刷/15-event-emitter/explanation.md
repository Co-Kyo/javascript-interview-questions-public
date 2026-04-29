# 15 - EventEmitter 五步讲解

---

## 第一步：理解核心数据结构

发布订阅模式的本质是 **事件名 → 回调列表** 的映射关系。

```
events = {
  'click':    [fn1, fn2],
  'message':  [fn3],
  'error':    [fn4, fn5, fn6]
}
```

用 `Map<string, Function[]>` 实现这个映射：
- **key**：事件名称（字符串）
- **value**：该事件的所有监听函数数组

这是整个实现的地基。`on` 是往数组里 push，`off` 是从数组里删，`emit` 是遍历数组并依次调用。

---

## 第二步：实现 on / off / emit（核心三件套）

### `on(event, fn)` — 订阅

```js
on(event, fn) {
  if (!this._events.has(event)) {
    this._events.set(event, []);
  }
  this._events.get(event).push(fn);
  return this;
}
```

逻辑极简：没有就创建数组，有就往里 push。返回 `this` 支持链式调用。

### `off(event, fn)` — 取消订阅

```js
off(event, fn) {
  const listeners = this._events.get(event);
  if (!listeners) return this;
  let idx = listeners.indexOf(fn);
  if (idx === -1) idx = listeners.findIndex(l => l._original === fn);
  if (idx !== -1) listeners.splice(idx, 1);
  if (listeners.length === 0) this._events.delete(event);
  return this;
}
```

关键点：
- **精确匹配**：用 `indexOf` 找到函数引用，只删第一个匹配项
- **once 兼容**：如果直接匹配失败，会检查 `_original` 属性，支持 `off(event, originalFn)` 移除 `once` 注册的监听器
- **清理空数组**：删完后如果数组为空，直接 `delete` 这个 key，防止内存泄漏
- 为什么用 `splice` 而不是 `filter`？因为只需要删一个，`splice` 更高效

### `emit(event, ...args)` — 发布

```js
emit(event, ...args) {
  const listeners = this._events.get(event);
  if (!listeners || listeners.length === 0) return false;
  const snapshot = [...listeners];
  for (const fn of snapshot) fn.apply(this, args);
  return true;
}
```

关键点：
- **快照机制**：`[...listeners]` 复制一份再遍历。为什么？因为回调里可能 `off` 或 `once`（会修改原数组），遍历中修改正在遍历的数组会导致跳过或重复执行
- 未注册的事件静默返回 `false`，不报错

---

## 第三步：实现 once（一次性监听器）

`once` 是面试的核心考点，实现思路是 **wrapper 替身**：

```js
once(event, fn) {
  const wrapper = (...args) => {
    this.off(event, wrapper);  // 先移除自身
    fn.apply(this, args);      // 再执行原始函数
  };
  wrapper._original = fn;      // 保存原始引用，支持 off 精确移除
  return this.on(event, wrapper);
}
```

**为什么先 `off` 再 `fn`？**

假设反过来（先 `fn` 再 `off`），如果 `fn` 内部又 `emit` 了同一事件，会产生意想不到的递归。先移除保证了安全性。

**`_original` 的作用是什么？**

注册时传入的是 `wrapper`，但如果用户后续想用 `off(event, fn)` 移除，直接 `indexOf(fn)` 找不到 `wrapper`。保存 `_original` 可以在需要时支持反向查找（加分项）。

---

## 第四步：处理边界情况

生产级的 EventEmitter 必须处理以下边界：

| 场景 | 处理方式 |
|------|---------|
| `emit` 未注册的事件 | 静默返回 `false`，不报错 |
| `off` 不存在的监听器 | `indexOf` 返回 -1，`splice` 不执行 |
| `off` 不存在的事件 | 直接 return |
| 回调中 `off` 当前事件 | 用快照 `[...listeners]` 避免遍历异常 |
| 回调中 `emit` 同一事件 | 快照 + 栈式调用，不会无限循环（因为快照是调用前的状态） |
| 大量监听器 | `splice` 比 `filter` 更高效（只删一个元素） |

---

## 第五步：扩展方法与实际应用

### 扩展方法

- **`removeAllListeners(event)`**：`Map.delete()` 清理，不传参数则 `Map.clear()`
- **`listenerCount(event)`**：返回数组长度，O(1)
- **`eventNames()`**：`Map.keys()` 展开为数组

### 面试延伸：发布订阅 vs 观察者模式

| 维度 | 发布订阅 | 观察者模式 |
|------|---------|-----------|
| 耦合度 | 松耦合，通过事件中心通信 | 紧耦合，Subject 直接通知 Observer |
| 中间层 | 有 EventChannel/Broker | 无，直接引用 |
| 灵活性 | 可动态添加/移除订阅 | 依赖接口约束 |
| 典型应用 | EventEmitter, EventBus | Vue 响应式, RxJS |

### 实际应用场景

```js
// 1. Vue 2 EventBus
const bus = new Vue();  // Vue 实例自带 $on/$emit/$off
bus.$on('login', handleLogin);

// 2. Node.js HTTP Server
const server = http.createServer();
server.on('request', handleRequest);
server.once('listening', () => console.log('Server started'));

// 3. DOM 事件
element.addEventListener('click', handler);  // 本质也是发布订阅
```

---

## 面试评分参考

- **5 分钟内写出 on/off/emit**：基本功扎实
- **正确实现 once 且理解 wrapper 机制**：理解设计模式
- **处理快照/边界情况**：考虑周全，有工程意识
- **能讲清发布订阅 vs 观察者模式**：理论功底深厚
- **加分项全部实现**：优秀候选人
