> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 20 - 事件委托

## 基本信息

| 项目 | 内容 |
|------|------|
| 分类 | DOM 与浏览器 API |
| 难度 | ⭐⭐ |
| 考察点 | 事件冒泡、事件捕获、matches API、DOM 事件模型 |

---

## 背景

在实际开发中，我们经常遇到这样的场景：

- **列表项动态增删**：一个 `<ul>` 中的 `<li>` 会通过 JavaScript 动态添加或删除（如待办事项、搜索结果、聊天消息列表）
- **内存占用问题**：如果为每个 `<li>` 都绑定事件监听器，当列表有成百上千项时，会产生大量事件监听器，严重影响性能
- **React 事件系统原理**：React 并不是给每个 DOM 节点绑定事件，而是在根节点上统一监听，通过事件委托机制将事件分发到对应组件——这正是事件委托思想的工程化应用

**事件委托（Event Delegation）** 利用 DOM 事件的冒泡机制，将子元素的事件统一委托给父元素处理，从而：
1. 减少事件监听器数量，降低内存占用
2. 自动支持动态添加的子元素，无需重复绑定
3. 统一管理事件逻辑，代码更简洁

---

## 题目要求

实现一个事件委托函数 `delegate`：

```js
function delegate(parent, selector, eventType, handler) {
  // 你的实现
}
```

### 参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| `parent` | Element | 监听事件的父元素 |
| `selector` | String | CSS 选择器，用于匹配触发事件的子元素 |
| `eventType` | String | 事件类型，如 `'click'`、`'mouseover'` 等 |
| `handler` | Function | 事件处理函数 |

### 返回值

返回一个 `unbind` 函数，调用后可以移除该委托事件监听器：

```js
const unbind = delegate(ul, 'li', 'click', handleClick);
// ... 需要时
unbind(); // 移除监听
```

### 使用示例

```html
<ul id="list">
  <li>项目 1</li>
  <li>项目 2</li>
  <li>项目 3</li>
</ul>

<script>
const ul = document.getElementById('list');

const unbind = delegate(ul, 'li', 'click', function(e) {
  // e.target 是实际被点击的 DOM 元素（可能是 li 或其后代）
  // this（即 handler 的 this）是匹配 'li' 选择器的最近祖先元素
  // e.currentTarget 是 ul（注册监听器的元素）
  console.log('点击了:', this.textContent); // 用 this 而非 e.target 更安全
});

// 动态添加的 li 也能被正确委托
const newLi = document.createElement('li');
newLi.textContent = '项目 4';
ul.appendChild(newLi);
// 点击"项目 4"同样会触发 handler

// 移除委托
unbind();
</script>
```

---

## 约束条件

1. **事件对象指向正确**：`handler` 中的 `e.target` 为实际点击的 DOM 元素（可能是后代），`this` 为匹配 `selector` 的最近祖先元素，`e.currentTarget` 为 `parent`
2. **支持动态子元素**：后续动态添加到 `parent` 中的、匹配 `selector` 的子元素也应能触发 `handler`
3. **支持嵌套匹配**：如果点击了 `selector` 匹配元素的后代元素，应能冒泡到匹配元素并正确触发（需要从 `e.target` 向上遍历查找最近的匹配元素）
4. **unbind 可用**：返回的 unbind 函数必须能正确移除事件监听，且多次调用不报错
5. **使用原生 API**：使用 `Element.matches()` 进行选择器匹配

---

## 进阶思考

1. 为什么 React 17 将事件委托的根节点从 `document` 改为 `root` 容器？
2. 事件委托在捕获阶段和冒泡阶段分别有什么应用场景？
3. `e.target` 和 `e.currentTarget` 的区别是什么？在委托场景中如何正确使用？
4. 如果需要阻止事件继续冒泡（`e.stopPropagation()`），事件委托还能正常工作吗？
5. 如何处理同一个元素上既有委托事件又有直接绑定事件的情况？
