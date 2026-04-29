/**
 * 虚拟列表 - VirtualList
 * 
 * 核心思想：只渲染可视区域内的 DOM 节点，通过占位容器模拟完整滚动高度。
 * 
 * 实现两个版本：
 *   1. FixedHeightVirtualList  — 固定高度版（简单高效）
 *   2. DynamicHeightVirtualList — 动态高度版（支持每项不同高度）
 */

// ============================================================
// 版本一：固定高度虚拟列表
// ============================================================

class FixedHeightVirtualList {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container     - 滚动容器
   * @param {Array}       options.data          - 全部数据
   * @param {number}      options.itemHeight    - 每项固定高度 (px)
   * @param {number}      options.visibleHeight - 可视区域高度 (px)
   * @param {number}      options.bufferSize    - 上下缓冲条数（默认 5）
   * @param {Function}    options.renderItem    - 渲染单个列表项的函数
   */
  constructor({ container, data, itemHeight, visibleHeight, bufferSize = 5, renderItem }) {
    this.container = container;
    this.data = data;
    this.itemHeight = itemHeight;
    this.visibleHeight = visibleHeight;
    this.bufferSize = bufferSize;
    this.renderItem = renderItem;

    // 计算可视区域能显示多少条
    this.visibleCount = Math.ceil(visibleHeight / itemHeight);

    // 当前渲染的起止索引（含 buffer）
    this.startIndex = 0;
    this.endIndex = 0;

    // DOM 引用
    this.phantom = null;   // 占位元素，撑起总高度
    this.content = null;   // 实际内容容器

    // 绑定滚动处理
    this._onScroll = this._throttle(this.onScroll.bind(this)); // ~60fps
    this.container.addEventListener('scroll', this._onScroll);
  }

  /**
   * 首次渲染：创建 DOM 结构并渲染初始内容
   */
  render() {
    if (this.data.length === 0) return; // 空数据防御
    this.container.style.overflow = 'auto';
    this.container.style.position = 'relative';

    // 1. 创建占位元素 —— 撑起完整的滚动高度
    this.phantom = document.createElement('div');
    this.phantom.style.height = `${this.data.length * this.itemHeight}px`;
    this.phantom.style.position = 'relative';

    // 2. 创建内容容器 —— 只放可视区域的节点
    this.content = document.createElement('div');
    this.content.style.position = 'absolute';
    this.content.style.top = '0';
    this.content.style.left = '0';
    this.content.style.right = '0';
    this.content.style.willChange = 'transform'; // 提示浏览器 GPU 加速

    this.phantom.appendChild(this.content);
    this.container.appendChild(this.phantom);

    // 3. 首次渲染可视区域
    this._renderItems();
  }

  /**
   * 核心：根据 scrollTop 计算 startIndex
   * @param {number} scrollTop - 当前滚动距离
   * @returns {number} 起始索引
   */
  getStartIndex(scrollTop) {
    return Math.floor(scrollTop / this.itemHeight);
  }

  /**
   * 核心：根据 startIndex 计算 endIndex
   * @param {number} startIndex
   * @returns {number} 结束索引（含 buffer）
   */
  getEndIndex(startIndex) {
    const endIndex = startIndex + this.visibleCount - 1;
    // 加上 buffer，并确保不超出数据范围
    return Math.min(endIndex + this.bufferSize, this.data.length - 1);
  }

  /**
   * 滚动事件处理 —— 核心调度逻辑
   */
  onScroll() {
    const scrollTop = this.container.scrollTop;

    // 计算带 buffer 的起始索引
    const rawStart = this.getStartIndex(scrollTop);
    const start = Math.max(0, rawStart - this.bufferSize); // 向上加 buffer
    const end = this.getEndIndex(rawStart);

    // 只有索引范围发生变化时才重新渲染
    if (start !== this.startIndex || end !== this.endIndex) {
      this.startIndex = start;
      this.endIndex = end;
      this._renderItems();
    }
  }

  /**
   * 渲染当前可视范围的列表项
   */
  _renderItems() {
    // 使用 transform 定位，避免修改 top/left 触发回流
    this.content.style.transform = `translateY(${this.startIndex * this.itemHeight}px)`;

    // 清空旧内容
    this.content.innerHTML = '';

    // 只创建可视区域 + buffer 范围内的节点
    const fragment = document.createDocumentFragment();
    for (let i = this.startIndex; i <= this.endIndex; i++) {
      const el = this.renderItem(this.data[i], i);
      el.style.height = `${this.itemHeight}px`;
      fragment.appendChild(el);
    }
    this.content.appendChild(fragment);
  }

  /**
   * 滚动到指定索引
   * @param {number} index - 目标索引
   */
  scrollToIndex(index) {
    this.container.scrollTop = index * this.itemHeight;
  }

  /**
   * 更新数据并重新渲染
   * @param {Array} newData
   */
  updateData(newData) {
    this.data = newData;
    this.phantom.style.height = `${this.data.length * this.itemHeight}px`;
    this.onScroll();
  }

  /**
   * 销毁实例，清理事件监听
   */
  destroy() {
    this.container.removeEventListener('scroll', this._onScroll);
    this.container.innerHTML = '';
  }

  /**
   * 简易节流：使用 requestAnimationFrame 确保每帧最多执行一次
   */
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
}


// ============================================================
// 版本二：动态高度虚拟列表
// ============================================================

class DynamicHeightVirtualList {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container       - 滚动容器
   * @param {Array}       options.data            - 全部数据
   * @param {number}      options.estimatedHeight - 预估每项高度（初始值，px）
   * @param {number}      options.visibleHeight   - 可视区域高度 (px)
   * @param {number}      options.bufferSize      - 上下缓冲条数（默认 5）
   * @param {Function}    options.renderItem      - 渲染单个列表项的函数
   */
  constructor({ container, data, estimatedHeight = 50, visibleHeight, bufferSize = 5, renderItem }) {
    this.container = container;
    this.data = data;
    this.estimatedHeight = estimatedHeight;
    this.visibleHeight = visibleHeight;
    this.bufferSize = bufferSize;
    this.renderItem = renderItem;

    // 核心数据结构：每个元素的缓存信息
    // { height: number, top: number, bottom: number }
    this.heightCache = [];
    this._initCache();

    // 当前渲染范围
    this.startIndex = 0;
    this.endIndex = 0;

    // DOM 引用
    this.phantom = null;
    this.content = null;

    this._onScroll = this._throttle(this.onScroll.bind(this));
    this.container.addEventListener('scroll', this._onScroll);
  }

  /**
   * 初始化高度缓存 —— 使用预估值
   */
  _initCache() {
    let top = 0;
    for (let i = 0; i < this.data.length; i++) {
      const height = this.estimatedHeight;
      this.heightCache.push({
        height,
        top,
        bottom: top + height
      });
      top += height;
    }
  }

  /**
   * 获取列表总高度
   */
  get totalHeight() {
    if (this.heightCache.length === 0) return 0;
    return this.heightCache[this.heightCache.length - 1].bottom;
  }

  /**
   * 核心：二分查找 —— 根据 scrollTop 找到 startIndex
   * 使用前缀和 + 二分，O(log n) 复杂度
   * @param {number} scrollTop
   * @returns {number} 起始索引
   */
  getStartIndex(scrollTop) {
    let low = 0;
    let high = this.heightCache.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midBottom = this.heightCache[mid].bottom;

      if (midBottom <= scrollTop) {
        low = mid + 1;
      } else if (this.heightCache[mid].top > scrollTop) {
        high = mid - 1;
      } else {
        // scrollTop 落在 mid 项的范围内
        return mid;
      }
    }
    return Math.max(0, low);
  }

  /**
   * 根据 startIndex 和可见高度计算 endIndex
   * 需要累加高度直到覆盖 visibleHeight
   * @param {number} startIndex
   * @returns {number} 结束索引
   */
  getEndIndex(startIndex) {
    let accHeight = 0;
    let i = startIndex;

    while (i < this.heightCache.length && accHeight < this.visibleHeight) {
      accHeight += this.heightCache[i].height;
      i++;
    }

    // 加上 buffer
    return Math.min(i + this.bufferSize - 1, this.data.length - 1);
  }

  /**
   * 首次渲染
   */
  render() {
    if (this.data.length === 0) return; // 空数据防御
    this.container.style.overflow = 'auto';
    this.container.style.position = 'relative';

    this.phantom = document.createElement('div');
    this.phantom.style.height = `${this.totalHeight}px`;
    this.phantom.style.position = 'relative';

    this.content = document.createElement('div');
    this.content.style.position = 'absolute';
    this.content.style.top = '0';
    this.content.style.left = '0';
    this.content.style.right = '0';
    this.content.style.willChange = 'transform';

    this.phantom.appendChild(this.content);
    this.container.appendChild(this.phantom);

    this._renderItems();
  }

  /**
   * 滚动事件处理
   */
  onScroll() {
    const scrollTop = this.container.scrollTop;
    const rawStart = this.getStartIndex(scrollTop);
    const start = Math.max(0, rawStart - this.bufferSize);
    const end = this.getEndIndex(rawStart);

    if (start !== this.startIndex || end !== this.endIndex) {
      this.startIndex = start;
      this.endIndex = end;
      this._renderItems();
    }
  }

  /**
   * 渲染列表项并测量真实高度
   */
  _renderItems() {
    if (this.startIndex >= this.data.length) return; // 边界防御
    const startTop = this.heightCache[this.startIndex].top;
    this.content.style.transform = `translateY(${startTop}px)`;

    this.content.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (let i = this.startIndex; i <= this.endIndex; i++) {
      const el = this.renderItem(this.data[i], i);
      fragment.appendChild(el);
    }
    this.content.appendChild(fragment);

    // 关键步骤：渲染后测量真实高度并更新缓存
    this._measureItems();
  }

  /**
   * 核心：测量已渲染元素的真实高度，更新缓存
   * 只有高度发生变化时才需要重新计算后续元素的 top/bottom
   */
  _measureItems() {
    const children = this.content.children;
    let firstChangedIndex = -1;

    for (let i = 0; i < children.length; i++) {
      const index = this.startIndex + i;
      const realHeight = children[i].getBoundingClientRect().height;
      const cachedHeight = this.heightCache[index].height;

      if (Math.abs(realHeight - cachedHeight) > 1) {
        this.heightCache[index].height = realHeight;
        if (firstChangedIndex === -1) firstChangedIndex = index;
      }
    }

    // 从第一个变化的索引开始，统一重算后续所有元素的 top/bottom
    if (firstChangedIndex !== -1) {
      const start = firstChangedIndex;
      this.heightCache[start].bottom = this.heightCache[start].top + this.heightCache[start].height;
      for (let j = start + 1; j < this.heightCache.length; j++) {
        this.heightCache[j].top = this.heightCache[j - 1].bottom;
        this.heightCache[j].bottom = this.heightCache[j].top + this.heightCache[j].height;
      }
      this.phantom.style.height = `${this.totalHeight}px`;
    }
  }

  /**
   * 滚动到指定索引
   */
  scrollToIndex(index) {
    if (index < 0 || index >= this.data.length) return;
    this.container.scrollTop = this.heightCache[index].top;
  }

  /**
   * 更新数据
   */
  updateData(newData) {
    this.data = newData;
    this.heightCache = [];
    this._initCache();
    this.phantom.style.height = `${this.totalHeight}px`;
    this.onScroll();
  }

  destroy() {
    this.container.removeEventListener('scroll', this._onScroll);
    this.container.innerHTML = '';
  }

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
}


// 便捷别名：默认使用固定高度版
const VirtualList = FixedHeightVirtualList;


// ============================================================
// 使用示例
// ============================================================

/*
// === 固定高度版 ===
const container1 = document.getElementById('list-1');
const data = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  text: `Item ${i}`
}));

const fixedList = new FixedHeightVirtualList({
  container: container1,
  data,
  itemHeight: 50,
  visibleHeight: 600,
  bufferSize: 5,
  renderItem: (item) => {
    const div = document.createElement('div');
    div.textContent = item.text;
    div.style.borderBottom = '1px solid #eee';
    div.style.padding = '0 16px';
    div.style.lineHeight = '50px';
    return div;
  }
});
fixedList.render();

// === 动态高度版 ===
const container2 = document.getElementById('list-2');
const dynamicData = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  text: `Item ${i} - ${'x'.repeat(Math.floor(Math.random() * 100))}`,
  color: `hsl(${i * 37 % 360}, 70%, 90%)`
}));

const dynamicList = new DynamicHeightVirtualList({
  container: container2,
  data: dynamicData,
  estimatedHeight: 40,
  visibleHeight: 600,
  bufferSize: 10,
  renderItem: (item) => {
    const div = document.createElement('div');
    div.textContent = item.text;
    div.style.background = item.color;
    div.style.padding = '8px 16px';
    div.style.borderBottom = '1px solid #ddd';
    div.style.wordBreak = 'break-word';
    return div;
  }
});
dynamicList.render();
*/
