# 虚拟列表 - 五步讲解

## 第一步：理解问题 —— 为什么需要虚拟列表？

### 朴素渲染的瓶颈

```
10000 条数据 → 创建 10000 个 DOM 节点 → 浏览器渲染引擎崩溃

时间线：
  首次渲染：创建 10000 个节点（~500ms+）
  每次滚动：浏览器计算 10000 个节点的布局（reflow）
  内存占用：每个节点 ~1KB → 10MB+ 仅 DOM 开销
```

### 虚拟列表的核心思想

```
人眼只能看到屏幕内的内容 → 只渲染屏幕上能看到的 + 少量缓冲

10000 条数据 → 创建 ~22 个 DOM 节点 → 浏览器轻松渲染

DOM 节点数：10000 → ~22（减少 99.78%）
首次渲染：500ms → ~5ms
滚动性能：卡顿 → 丝滑
```

### 关键公式

```
可视区域能显示的条数 = Math.ceil(可视区域高度 / 每项高度)

startIndex = Math.floor(scrollTop / 每项高度)
endIndex   = startIndex + visibleCount - 1
```

---

## 第二步：固定高度版 —— 最简实现

### DOM 结构设计

```
container (overflow: auto, 固定高度)
  └── phantom (总高度 = 数据量 × 每项高度, 撑起滚动条)
        └── content (absolute 定位, 只放可视区域的节点)
              ├── item[0]
              ├── item[1]
              └── ... (只有 ~20 个)
```

### 核心算法

```javascript
// 每次滚动触发：
onScroll() {
  const scrollTop = this.container.scrollTop;

  // 1. 计算起始索引（O(1)）
  const startIndex = Math.floor(scrollTop / this.itemHeight);

  // 2. 计算结束索引（O(1)）
  const endIndex = startIndex + this.visibleCount - 1;

  // 3. 带 buffer 的安全范围
  const start = Math.max(0, startIndex - this.bufferSize);
  const end = Math.min(endIndex + this.bufferSize, this.data.length - 1);

  // 4. 用 transform 偏移内容（避免修改 top 触发回流）
  this.content.style.transform = `translateY(${start * this.itemHeight}px)`;

  // 5. 只渲染这个范围的节点
  this._renderItems(start, end);
}
```

### 为什么用 `transform` 而不是 `top`？

```
修改 top/left → 触发 layout（回流）→ 浏览器重新计算布局
修改 transform → 只触发 composite（合成）→ GPU 直接处理，极快

性能差异：transform 比 top 快 10~100 倍
```

---

## 第三步：动态高度版 —— 核心挑战

### 问题：高度未知怎么办？

```
固定高度：每项 50px → scrollTop 2500 → startIndex = 50（直接除法）
动态高度：每项 30~80px 不等 → scrollTop 2500 → ???

无法用简单除法，需要知道每一项的真实高度
```

### 解决方案：高度缓存 + 累积定位 + 二分查找

```javascript
// 高度缓存数组（累积定位结构）
heightCache = [
  { height: 40, top: 0,    bottom: 40  },   // 第 0 项
  { height: 60, top: 40,   bottom: 100 },   // 第 1 项
  { height: 35, top: 100,  bottom: 135 },   // 第 2 项
  { height: 50, top: 135,  bottom: 185 },   // 第 3 项
  // ...
];

// 查找 scrollTop = 120 落在哪一项？
// 120 落在 top=100 和 bottom=135 之间 → 第 2 项
```

### 二分查找定位 startIndex（O(log n)）

```javascript
getStartIndex(scrollTop) {
  let low = 0, high = this.heightCache.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const { top, bottom } = this.heightCache[mid];

    if (bottom <= scrollTop) {
      low = mid + 1;        // scrollTop 在 mid 下方
    } else if (top > scrollTop) {
      high = mid - 1;       // scrollTop 在 mid 上方
    } else {
      return mid;            // scrollTop 落在 mid 项内
    }
  }
  return low;
}
```

### 渲染后测量真实高度

```javascript
_renderItems() {
  // 1. 先用缓存高度定位
  // 2. 渲染 DOM 节点
  // 3. 渲染后测量真实高度
  // 4. 如果与缓存不一致，更新缓存 + 后续所有元素的 top/bottom

  _measureItems() {
    const children = this.content.children;
    for (let i = 0; i < children.length; i++) {
      const index = this.startIndex + i;
      const realHeight = children[i].getBoundingClientRect().height;

      if (realHeight !== this.heightCache[index].height) {
        // 更新该项及后续所有项的位置信息
        this.heightCache[index].height = realHeight;
        this.heightCache[index].bottom = this.heightCache[index].top + realHeight;
        // 从该项起重新计算后续所有项的 top/bottom
        for (let j = index + 1; j < this.heightCache.length; j++) {
          this.heightCache[j].top = this.heightCache[j-1].bottom;
          this.heightCache[j].bottom = this.heightCache[j].top + this.heightCache[j].height;
        }
      }
    }
  }
}
```

### 渐进精确的过程

```
初始状态：所有项使用预估值 50px
  → 位置可能有偏差（白屏/跳动）

用户滚动后：可视区域内的项被测量，缓存更新
  → 越滚越精确

长期使用：几乎所有项的真实高度都被缓存
  → 位置完全准确，滚动丝滑
```

---

## 第四步：性能优化细节

### 1. 节流 vs 防抖

```javascript
// ❌ 防抖：滚动结束后才触发，中间会白屏
debounce(onScroll, 16)

// ✅ 节流：每帧最多触发一次，滚动过程持续更新
throttle(onScroll, 16)  // 或用 requestAnimationFrame

// 最佳实践：
_onScroll = () => {
  if (this.rafId) return;
  this.rafId = requestAnimationFrame(() => {
    this.onScroll();
    this.rafId = null;
  });
};
```

### 2. 减少 DOM 操作

```javascript
// ❌ 逐个 appendChild（触发多次回流）
for (const item of visibleItems) {
  this.content.appendChild(item);
}

// ✅ 使用 DocumentFragment（只触发一次回流）
const fragment = document.createDocumentFragment();
for (const item of visibleItems) {
  fragment.appendChild(item);
}
this.content.appendChild(fragment);
```

### 3. 避免不必要的渲染

```javascript
// 只有索引范围变化时才重新渲染
if (start !== this.startIndex || end !== this.endIndex) {
  this.startIndex = start;
  this.endIndex = end;
  this._renderItems();
}
```

> **补充：`will-change` 提示**
> 对于频繁使用 `transform` 的场景，可以通过 `will-change: 'transform'` 提示浏览器提前创建合成层。但需注意：MDN 将 `will-change` 定义为"最后手段（last resort）"，仅在确实观察到性能问题时才使用，滥用反而会增加内存开销。

### 4. 复用 DOM 节点（进阶）

```javascript
// 高级优化：不销毁旧节点，而是复用池中的节点
// 类似 React 的 key-based reconciliation
const nodePool = [];

function getNode() {
  return nodePool.pop() || document.createElement('div');
}

function recycleNode(node) {
  node.innerHTML = '';
  node.style.transform = '';
  nodePool.push(node);
}
```

---

## 第五步：面试回答策略

### 开场：先说核心思想

> "虚拟列表的核心思想是只渲染可视区域内的 DOM 节点。通过一个占位容器撑起总滚动高度，让滚动条行为正确，然后根据 scrollTop 计算出需要渲染的索引范围，只创建这些节点。"

### 主体：分固定高度和动态高度

> "实现分两个版本。固定高度版很简单，startIndex = Math.floor(scrollTop / itemHeight)，O(1) 复杂度。动态高度版需要维护一个高度缓存数组，用二分查找定位 startIndex，O(log n) 复杂度。首次用预估值，渲染后测量真实高度并更新缓存，越用越精确。"

### 细节：主动说优化点

> "性能方面有几个关键点：用 transform 代替 top 定位避免回流；用 requestAnimationFrame 节流而不是防抖，保证滚动过程持续更新；用 DocumentFragment 批量插入 DOM；加 buffer 区域避免快速滚动白屏。"

### 追问应对

| 追问 | 回答要点 |
|------|----------|
| React 中怎么做？ | 核心逻辑相同，`render` 返回可见子集 + `key` 复用节点。库：react-virtualized、react-window |
| 如何支持不等高 + 滚动到底加载更多？ | endIndex 到达末尾时触发加载，新数据 append 到 data 数组，重新计算缓存 |
| 和 IntersectionObserver 的区别？ | IO 是检测元素可见性的 API，不控制渲染节点数；虚拟列表是精确控制 DOM 数量的策略 |
| 如何支持横向滚动？ | 将 scrollTop/height 替换为 scrollLeft/width，逻辑完全一样 |
| 能否支持瀑布流（多列）？ | 需要按列维护高度缓存，取最短列的累计高度来定位下一项的位置 |

### 收尾：总结适用场景

> "虚拟列表适用于大数据量的长列表场景，如聊天记录、商品列表、日志查看器等。核心取舍是用计算换渲染——用少量的 JS 计算（索引定位）替代大量的 DOM 操作，显著提升渲染性能。"
