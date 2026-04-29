> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 20 - 事件委托

- **分类**：DOM 与浏览器 API | **难度**：⭐⭐ | **考察点**：事件冒泡、事件捕获、matches API、DOM 事件模型

## 题目要求

实现一个事件委托函数 `delegate`：

```javascript
function delegate(parent, selector, eventType, handler) {
  // 你的实现
}
```

### 参数说明

| 参数 | 类型 | 说明 |
|------|------|------|
| `parent` | Element | 监听事件的父元素 |
| `selector` | String | CSS 选择器，用于匹配触发事件的子元素 |
| `eventType` | String | 事件类型，如 `'click'`、`'mouseover'` |
| `handler` | Function | 事件处理函数 |

返回一个 `unbind` 函数，调用后移除该委托事件监听器。

## 示例

```javascript
const ul = document.getElementById('list');

const unbind = delegate(ul, 'li', 'click', function(e) {
  // this → 匹配 selector 的最近祖先元素
  // e.target → 实际点击的 DOM 元素（可能是后代）
  console.log('点击了:', this.textContent);
});

// 动态添加的 li 也能被正确委托
const newLi = document.createElement('li');
newLi.textContent = '新项目';
ul.appendChild(newLi);

unbind(); // 移除监听
```

## 约束

1. `handler` 中 `this` 为匹配 `selector` 的最近祖先元素，`e.target` 为实际点击元素
2. 支持动态子元素：后续添加的匹配元素也能触发
3. 支持嵌套匹配：点击匹配元素的后代时，应向上遍历找到匹配元素
4. `unbind` 多次调用不报错
5. 使用 `Element.matches()` 进行选择器匹配
