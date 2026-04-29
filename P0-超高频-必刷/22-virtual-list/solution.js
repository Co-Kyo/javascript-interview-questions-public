class FixedHeightVirtualList {
  constructor({ container, data, itemHeight, visibleHeight, bufferSize = 5, renderItem }) {
    this.container = container;
    this.data = data;
    this.itemHeight = itemHeight;
    this.visibleHeight = visibleHeight;
    this.bufferSize = bufferSize;
    this.renderItem = renderItem;

    this.visibleCount = Math.ceil(visibleHeight / itemHeight);
    this.startIndex = 0;
    this.endIndex = 0;
    this.phantom = null;
    this.content = null;

    this._onScroll = this._throttle(this.onScroll.bind(this));
    this.container.addEventListener('scroll', this._onScroll);
  }

  render() {
    if (this.data.length === 0) return;
    this.container.style.overflow = 'auto';
    this.container.style.position = 'relative';

    this.phantom = document.createElement('div');
    this.phantom.style.height = `${this.data.length * this.itemHeight}px`;
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

  getStartIndex(scrollTop) {
    return Math.floor(scrollTop / this.itemHeight);
  }

  getEndIndex(startIndex) {
    const endIndex = startIndex + this.visibleCount - 1;
    return Math.min(endIndex + this.bufferSize, this.data.length - 1);
  }

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

  _renderItems() {
    this.content.style.transform = `translateY(${this.startIndex * this.itemHeight}px)`;
    this.content.innerHTML = '';

    const fragment = document.createDocumentFragment();
    for (let i = this.startIndex; i <= this.endIndex; i++) {
      const el = this.renderItem(this.data[i], i);
      el.style.height = `${this.itemHeight}px`;
      fragment.appendChild(el);
    }
    this.content.appendChild(fragment);
  }

  scrollToIndex(index) {
    this.container.scrollTop = index * this.itemHeight;
  }

  updateData(newData) {
    this.data = newData;
    this.phantom.style.height = `${this.data.length * this.itemHeight}px`;
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


class DynamicHeightVirtualList {
  constructor({ container, data, estimatedHeight = 50, visibleHeight, bufferSize = 5, renderItem }) {
    this.container = container;
    this.data = data;
    this.estimatedHeight = estimatedHeight;
    this.visibleHeight = visibleHeight;
    this.bufferSize = bufferSize;
    this.renderItem = renderItem;

    this.heightCache = [];
    this._initCache();

    this.startIndex = 0;
    this.endIndex = 0;
    this.phantom = null;
    this.content = null;

    this._onScroll = this._throttle(this.onScroll.bind(this));
    this.container.addEventListener('scroll', this._onScroll);
  }

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

  get totalHeight() {
    if (this.heightCache.length === 0) return 0;
    return this.heightCache[this.heightCache.length - 1].bottom;
  }

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
        return mid;
      }
    }
    return Math.max(0, low);
  }

  getEndIndex(startIndex) {
    let accHeight = 0;
    let i = startIndex;

    while (i < this.heightCache.length && accHeight < this.visibleHeight) {
      accHeight += this.heightCache[i].height;
      i++;
    }

    return Math.min(i + this.bufferSize - 1, this.data.length - 1);
  }

  render() {
    if (this.data.length === 0) return;
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

  _renderItems() {
    if (this.startIndex >= this.data.length) return;
    const startTop = this.heightCache[this.startIndex].top;
    this.content.style.transform = `translateY(${startTop}px)`;

    this.content.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (let i = this.startIndex; i <= this.endIndex; i++) {
      const el = this.renderItem(this.data[i], i);
      fragment.appendChild(el);
    }
    this.content.appendChild(fragment);

    this._measureItems();
  }

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

  scrollToIndex(index) {
    if (index < 0 || index >= this.data.length) return;
    this.container.scrollTop = this.heightCache[index].top;
  }

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

const VirtualList = FixedHeightVirtualList;

module.exports = { FixedHeightVirtualList, DynamicHeightVirtualList, VirtualList };
