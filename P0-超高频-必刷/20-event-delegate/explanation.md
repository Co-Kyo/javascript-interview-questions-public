# 事件委托 - 五步讲解

## 第一步：理解 DOM 事件流

DOM 事件的传播分为三个阶段：

```
捕获阶段 (Capture)     →  事件从 window 向下传递到目标元素
目标阶段 (Target)       →  事件到达目标元素本身
冒泡阶段 (Bubble)       →  事件从目标元素向上传递回 window
```

**示意图：**

```
window
  └── document
        └── html
              └── body
                    └── ul         ← 冒泡经过
                          └── li   ← 目标元素 (e.target)
```

当点击 `<li>` 时，事件会从 window 一路向下（捕获），到达 li（目标），再一路向上（冒泡）。`addEventListener` 默认在冒泡阶段监听。

**关键认知**：冒泡意味着父元素能"听到"子元素的事件——这正是事件委托的基础。

---

## 第二步：事件委托的核心原理

**传统方式**（不推荐）：
```js
// 每个 li 都绑定一个监听器 → 100 个 li = 100 个监听器
document.querySelectorAll('li').forEach(li => {
  li.addEventListener('click', handleClick);
});
```

**委托方式（简化版，仅用于理解原理）**：
```js
// 只在父元素 ul 上绑定 1 个监听器
ul.addEventListener('click', function(e) {
  // ⚠️ 简化版：当 li 内部有子元素（如 <li><span>文本</span></li>）时，
  // 点击 span 会导致 e.target 是 span 而非 li，此处匹配会失败。
  // 完整实现见第三步的向上遍历方案。
  if (e.target.matches('li')) {
    handleClick(e);
  }
});
```

**优势对比：**

| 方面 | 传统方式 | 事件委托 |
|------|---------|---------|
| 监听器数量 | N 个（N = 子元素数） | 1 个 |
| 内存占用 | 高 | 低 |
| 动态元素支持 | 需重新绑定 | 自动支持 |
| 代码维护 | 分散 | 集中 |

---

## 第三步：处理 e.target 的陷阱

**核心问题**：`e.target` 是实际触发事件的元素，不是你想匹配的元素。

```html
<li><span>项目 1</span></li>
```

点击 `<span>` 时：
- `e.target` → `<span>`（实际点击的元素）
- `e.currentTarget` → `<ul>`（注册监听器的元素）

但我们的选择器是 `'li'`，`span.matches('li')` 返回 `false`！

**解决方案**：从 `e.target` 向上遍历，找到最近的匹配元素：

```js
let target = e.target;
while (target && target !== parent) {
  if (target.matches(selector)) {
    handler.call(target, e);
    return;
  }
  target = target.parentElement;
}
```

这就是为什么 `delegate` 函数中需要一个 `while` 循环——它处理了"点击后代元素"的边界情况。

---

## 第四步：完整实现要点

```js
function delegate(parent, selector, eventType, handler) {
  function listener(e) {
    let target = e.target;
    while (target && target !== parent) {
      if (target.matches(selector)) {
        handler.call(target, e);  // this 指向匹配元素
        return;
      }
      target = target.parentElement;
    }
    // 边界：selector 匹配 parent 本身
    if (parent.matches(selector)) {
      handler.call(parent, e);
    }
  }
  parent.addEventListener(eventType, listener);
  return function unbind() {
    parent.removeEventListener(eventType, listener);
  };
}
```

**实现要点总结：**

1. **单监听器**：在 parent 上只绑定一个 listener
2. **向上遍历**：从 e.target 向上找匹配 selector 的元素
3. **matches API**：使用原生 `Element.matches()` 做选择器匹配
4. **this 修正**：`handler.call(target, e)` 让 handler 中的 this 指向匹配元素
5. **unbind 返回**：返回移除函数，支持手动解绑

---

## 第五步：实际应用与延伸

### React 中的事件委托

React 16 及之前：所有事件委托到 `document` 上
React 17+：所有事件委托到 React root 容器上

```js
// React 内部简化逻辑（伪代码）
rootContainer.addEventListener('click', function(e) {
  const fiberNode = findFiberByDom(e.target);
  if (fiberNode && fiberNode.props.onClick) {
    fiberNode.props.onClick(e);
  }
});
```

这就是为什么：
- React 事件是"合成事件"（SyntheticEvent）
- 在 React 中 `e.stopPropagation()` 不能阻止原生 DOM 事件冒泡
- React 17 改用 root 容器是为了支持多版本 React 共存

### 常见应用场景

1. **大量列表项**：表格行操作、商品列表、消息列表
2. **动态内容**：Ajax 加载后的内容、虚拟滚动
3. **统一拦截**：全局链接点击拦截、表单提交委托
4. **性能优化**：减少内存占用，避免监听器泄漏

### 注意事项

- `e.stopPropagation()` 会阻止事件冒泡到 parent，导致委托失效；若需在委托场景下阻止冒泡到更上层但不影响当前委托，可在 handler 内调用但需注意影响范围
- `display: none` 的元素不会触发事件
- 某些事件不冒泡：`focus`、`blur`、`mouseenter`、`mouseleave`（可用 `focusin`/`focusout`/`mouseover`/`mouseout` 替代）
- **捕获阶段委托**：`addEventListener(type, handler, true)` 可在捕获阶段拦截事件，适用于需要在事件到达目标前就处理的场景（如全局点击埋点、模态框外点击关闭）
