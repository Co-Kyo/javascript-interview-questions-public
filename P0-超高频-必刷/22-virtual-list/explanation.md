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
onScroll() {
  const scrollTop = this.container.scrollTop;
  const startIndex = Math.floor(scrollTop / this.itemHeight);
  const endIndex = startIndex + this.visibleCount - 1;
  const start = Math.max(0, startIndex - this.bufferSize);
  const end = Math.min(endIndex + this.bufferSize, this.data.length - 1);
  this.content.style.transform = `translateY(${start * this.itemHeight}px)`;
  this._renderItems(start, end);
}
```

每次滚动触发时：先算起始索引（O(1) 直接除法），再算结束索引，加上 buffer 安全范围，用 `transform` 偏移内容位置，只渲染这个范围的节点。

### 为什么用 `transform` 而不是 `top`？

修改 `top`/`left` 会触发 layout（回流），浏览器重新计算布局。修改 `transform` 只触发 composite（合成），GPU 直接处理，快 10~100 倍。

---

## 第三步：动态高度版 —— 核心挑战

### 问题：高度未知怎么办？

固定高度可以用简单除法定位，但动态高度每项 30~80px 不等，无法用 `scrollTop / height` 直接算出。

### 解决方案：高度缓存 + 累积定位 + 二分查找

```javascript
heightCache = [
  { height: 40, top: 0,    bottom: 40  },
  { height: 60, top: 40,   bottom: 100 },
  { height: 35, top: 100,  bottom: 135 },
  { height: 50, top: 135,  bottom: 185 },
];
```

每个元素缓存 `{ height, top, bottom }`，形成前缀和结构。查找 `scrollTop = 120` 落在哪一项时，用二分查找 O(log n) 定位。

### 二分查找定位 startIndex

```javascript
getStartIndex(scrollTop) {
  let low = 0, high = this.heightCache.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (this.heightCache[mid].bottom <= scrollTop) low = mid + 1;
    else if (this.heightCache[mid].top > scrollTop) high = mid - 1;
    else return mid;
  }
  return Math.max(0, low);
}
```

当 `scrollTop` 落在某项的 `top` 和 `bottom` 之间时返回该项索引。找不到精确匹配时返回 `low`（最近的下一项）。

### 渲染后测量真实高度

渲染完 DOM 节点后，用 `getBoundingClientRect().height` 测量真实高度，与缓存对比。如果差异超过 1px，更新该项及后续所有项的 `top`/`bottom`。这就是"渐进精确"——越滚越准。

---

## 第四步：性能优化细节

### 1. 节流 vs 防抖

```javascript
_throttle(fn) {
  let timer = null;
  return function (...args) {
    if (timer) return;
    timer = requestAnimationFrame(() => {
      fn.apply(this, args);
      timer = null;
    });
  };
}
```

> ⚠️ 如果用防抖，滚动结束后才触发，中间会白屏。用节流（`requestAnimationFrame`）确保每帧最多执行一次，滚动过程持续更新。

用 `requestAnimationFrame` 实现节流，确保每帧最多执行一次滚动处理。

### 2. 减少 DOM 操作

使用 `DocumentFragment` 批量插入节点，只触发一次回流。逐个 `appendChild` 会触发多次回流。

### 3. 避免不必要的渲染

```javascript
if (start !== this.startIndex || end !== this.endIndex) {
}
```

只有索引范围变化时才重新渲染，避免不必要的 DOM 操作。


### 4. `will-change` 提示

对于频繁使用 `transform` 的场景，`will-change: 'transform'` 提示浏览器提前创建合成层。但 MDN 将其定义为"最后手段"，仅在确实观察到性能问题时才使用。

---

## 第五步：面试回答策略

### 开场：先说核心思想

> "虚拟列表的核心思想是只渲染可视区域内的 DOM 节点。通过一个占位容器撑起总滚动高度，让滚动条行为正确，然后根据 scrollTop 计算出需要渲染的索引范围，只创建这些节点。"

### 主体：分固定高度和动态高度

> "实现分两个版本。固定高度版很简单，startIndex = Math.floor(scrollTop / itemHeight)，O(1) 复杂度。动态高度版需要维护一个高度缓存数组，用二分查找定位 startIndex，O(log n) 复杂度。首次用预估值，渲染后测量真实高度并更新缓存，越用越精确。"

### 细节：主动说优化点

> "性能方面有几个关键点：用 transform 代替 top 定位避免回流；用 requestAnimationFrame 节流而不是防抖，保证滚动过程持续更新；用 DocumentFragment 批量插入 DOM；加 buffer 区域避免快速滚动白屏。"
