> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 22 - 无限滚动（虚拟列表）

- **分类**：DOM 与浏览器 API | **难度**：⭐⭐⭐ | **考察点**：滚动计算、可视区域、DOM 复用、性能优化

## 题目要求

实现 `FixedHeightVirtualList`（固定高度）和 `DynamicHeightVirtualList`（动态高度）两个类：

### 核心功能
1. 只渲染可视区域内的列表项，DOM 中始终只有约 `visibleCount` 个节点
2. 滚动时动态更新，根据滚动位置计算起始/结束索引
3. 使用占位容器撑起总滚动高度，保证滚动条行为正确
4. 支持缓冲区（buffer），避免快速滚动白屏

### 核心方法
- `render()` — 首次渲染
- `onScroll()` — 滚动事件处理
- `getStartIndex(scrollTop)` — 计算起始索引
- `getEndIndex(startIndex)` — 计算结束索引
- `scrollToIndex(index)` — 滚动到指定项
- `updateData(newData)` — 更新数据
- `destroy()` — 销毁实例

## 示例

```javascript
const data = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  text: `Item ${i}`
}));

const vList = new FixedHeightVirtualList({
  container: document.getElementById('list'),
  data,
  itemHeight: 50,
  visibleHeight: 600,
  bufferSize: 5,
  renderItem: (item) => {
    const div = document.createElement('div');
    div.textContent = item.text;
    return div;
  }
});
vList.render();
// DOM 中始终只有约 22 个节点（12 可视 + 10 buffer）
```

## 约束

1. **固定高度**：所有列表项高度一致，`startIndex = Math.floor(scrollTop / itemHeight)`
2. **动态高度**：列表项高度不固定，需缓存已测量高度，用二分查找定位
3. 滚动必须平滑无闪烁
4. 使用 `transform` 偏移而非修改 `top`，避免回流
5. 使用 `requestAnimationFrame` 节流
