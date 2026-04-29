> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 22 - 无限滚动（虚拟列表）

## 📋 题目信息

| 项目 | 内容 |
|------|------|
| **分类** | DOM 与浏览器 API |
| **难度** | ⭐⭐⭐ |
| **考察点** | 滚动计算、可视区域、DOM 复用、性能优化 |

---

## 📖 背景

在实际开发中，我们经常需要渲染大量数据的列表（如 10000+ 条记录）。如果一次性将所有数据渲染为 DOM 节点，会导致：

- DOM 节点数量庞大，页面首次渲染极慢
- 滚动时浏览器需要频繁回流（reflow）和重绘（repaint）
- 内存占用过高，低端设备可能直接卡死

**虚拟列表（Virtual List / Virtualized List）** 是一种性能优化方案：只渲染可视区域内的列表项，滚动时动态替换 DOM 内容，使 DOM 中始终只保留少量节点。

---

## 🎯 题目要求

实现 `FixedHeightVirtualList`（固定高度）和 `DynamicHeightVirtualList`（动态高度）两个类，满足以下要求：

### 核心功能
1. **只渲染可视区域内的列表项**，DOM 中始终只有约 `visibleCount` 个节点
2. **滚动时动态更新**：监听滚动事件，根据滚动位置计算需要渲染的起始索引和结束索引
3. **使用占位容器**撑起总滚动高度，保证滚动条行为正确
4. **支持缓冲区（buffer）**：在可视区域上下各预留若干条数据，避免快速滚动时出现白屏

### 额外约束
- 支持**固定高度**模式：所有列表项高度一致
- 支持**动态高度**模式：列表项高度不固定，需要缓存已测量的高度
- 滚动必须**平滑无闪烁**
- 核心方法：`render()`、`onScroll()`、`getStartIndex()`、`getEndIndex()`

---

## 💻 示例

```javascript
// 创建一个容器元素
const container = document.getElementById('list-container');

// 生成 10000 条测试数据
const data = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  text: `Item ${i}`,
  height: 30 + Math.random() * 20 // 动态高度：30~50px
}));

// 初始化虚拟列表（固定高度版）
const vList = new FixedHeightVirtualList({
  container,
  data,
  itemHeight: 50,        // 每项固定高度 50px
  visibleHeight: 600,    // 可视区域高度 600px（可显示 ~12 条）
  bufferSize: 5,         // 上下各缓冲 5 条
  renderItem: (item) => {
    const div = document.createElement('div');
    div.textContent = item.text;
    return div;
  }
});

vList.render();
// DOM 中始终只有约 22 个节点（12 可视 + 5 上缓冲 + 5 下缓冲）
// 而不是 10000 个节点
```

### 预期行为

```
初始状态：
  总数据：10000 条
  可视区域高度：600px
  每项高度：50px
  可显示条数：600 / 50 = 12 条
  startIndex = 0, endIndex = 11（+ buffer）
  DOM 节点数 ≈ 22

滚动到第 500 条时：
  scrollTop = 500 * 50 = 25000px
  startIndex = 500, endIndex = 511（+ buffer）
  DOM 节点数 ≈ 22（始终不变）
  占位容器高度 = 10000 * 50 = 500000px
```

---

## 🔍 考察要点

| 考察点 | 具体内容 |
|--------|----------|
| **滚动计算** | 根据 `scrollTop` 正确计算 `startIndex` 和 `endIndex` |
| **可视区域** | 理解 `clientHeight`、`scrollHeight`、`scrollTop` 的关系 |
| **DOM 复用** | 只创建/更新可视区域内的节点，而非全部渲染 |
| **性能优化** | 使用 `transform` 偏移代替频繁 DOM 插入，使用 `requestAnimationFrame` 节流 |
| **动态高度** | 高度不固定时如何维护高度缓存和定位 |
| **边界处理** | 滚动到顶部/底部时的索引边界、空数据处理 |

---

## ⚠️ 常见追问

1. **如何支持动态高度？** — 初始用预估值，渲染后测量真实高度并缓存，使用前缀和数组快速定位
2. **如何避免快速滚动白屏？** — 增加 buffer 区域 + 使用 `will-change: transform` 提示浏览器优化
3. **如何支持滚动到指定项？** — 计算该项的偏移量，设置 `container.scrollTop`
4. **和 IntersectionObserver 有什么区别？** — IO 用于检测元素是否进入视口，不适用于精确控制渲染节点数
5. **React/Vue 中如何实现？** — 核心逻辑相同，框架负责 DOM diff，需要在 `render` 中返回正确的可见子集
