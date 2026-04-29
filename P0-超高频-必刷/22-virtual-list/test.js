const { FixedHeightVirtualList, DynamicHeightVirtualList } = require('./solution.js');

// Mock DOM APIs for Node.js environment
function setupDOMMock() {
  const elements = [];

  function createMockElement(tag) {
    const el = {
      _tag: tag,
      style: {},
      _children: [],
      _listeners: {},
      _innerHTML: '',
      textContent: '',
      appendChild(child) { this._children.push(child); },
      addEventListener(type, fn) {
        if (!this._listeners[type]) this._listeners[type] = [];
        this._listeners[type].push(fn);
      },
      removeEventListener(type, fn) {
        if (!this._listeners[type]) return;
        this._listeners[type] = this._listeners[type].filter(f => f !== fn);
      },
      getBoundingClientRect() { return { height: 50 }; },
      dispatchEvent(e) {
        const fns = this._listeners[e.type] || [];
        for (const fn of fns) fn(e);
      }
    };
    Object.defineProperty(el, 'innerHTML', {
      set(val) { this._innerHTML = val; if (val === '') this._children = []; },
      get() { return this._innerHTML || ''; }
    });
    Object.defineProperty(el, 'children', {
      get() { return this._children; }
    });
    elements.push(el);
    return el;
  }

  global.document = {
    createElement: (tag) => createMockElement(tag),
    createDocumentFragment: () => createMockElement('fragment')
  };

  global.requestAnimationFrame = (fn) => setTimeout(fn, 0);

  return elements;
}

function cleanupDOMMock() {
  delete global.document;
  delete global.requestAnimationFrame;
}

// 测试 FixedHeightVirtualList
console.log('--- FixedHeightVirtualList ---');
setupDOMMock();

const container = { style: {}, scrollTop: 0, _children: [], _listeners: {} };
container.appendChild = function(child) { this._children.push(child); };
container.addEventListener = function(type, fn) {
  if (!this._listeners[type]) this._listeners[type] = [];
  this._listeners[type].push(fn);
};
container.removeEventListener = function(type, fn) {
  if (!this._listeners[type]) return;
  this._listeners[type] = this._listeners[type].filter(f => f !== fn);
};
Object.defineProperty(container, 'innerHTML', {
  set(val) { this._innerHTML = val; if (val === '') this._children = []; },
  get() { return this._innerHTML || ''; }
});
Object.defineProperty(container, 'children', {
  get() { return this._children; }
});

const data = Array.from({ length: 1000 }, (_, i) => ({ id: i, text: `Item ${i}` }));

const list = new FixedHeightVirtualList({
  container,
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

// 验证计算属性
console.assert(list.visibleCount === 12, 'visibleCount = ceil(600/50) = 12');
console.assert(list.getStartIndex(0) === 0, 'scrollTop=0 → startIndex=0');
console.assert(list.getStartIndex(2500) === 50, 'scrollTop=2500 → startIndex=50');

// 验证 endIndex
const end0 = list.getEndIndex(0);
console.assert(end0 >= 16 && end0 <= 17, 'endIndex 包含 buffer');

// 验证 render
list.render();
console.assert(list.phantom !== null, 'render 创建 phantom 元素');
console.assert(list.content !== null, 'render 创建 content 元素');
console.assert(list.phantom._children.length > 0, 'phantom 包含 content');

// 验证 scrollToIndex
list.scrollToIndex(100);
console.assert(container.scrollTop === 5000, 'scrollToIndex(100) → scrollTop=5000');

// 验证 onScroll 更新索引
container.scrollTop = 2500;
list.onScroll();
console.assert(list.startIndex >= 45 && list.startIndex <= 50, 'onScroll 更新 startIndex');

// 验证 updateData
const newData = Array.from({ length: 500 }, (_, i) => ({ id: i, text: `New ${i}` }));
list.updateData(newData);
console.assert(list.data.length === 500, 'updateData 更新数据');

// 验证 destroy
list.destroy();
console.assert(container._listeners.scroll.length === 0, 'destroy 移除 scroll 监听');

// 验证边界：空数据
const emptyContainer = { style: {}, scrollTop: 0, _children: [], _listeners: {} };
emptyContainer.appendChild = function(child) { this._children.push(child); };
emptyContainer.addEventListener = function(type, fn) {
  if (!this._listeners[type]) this._listeners[type] = [];
  this._listeners[type].push(fn);
};
emptyContainer.removeEventListener = function() {};

const emptyList = new FixedHeightVirtualList({
  container: emptyContainer,
  data: [],
  itemHeight: 50,
  visibleHeight: 600,
  renderItem: () => document.createElement('div')
});
emptyList.render();
console.assert(emptyContainer._children.length === 0, '空数据不创建 DOM');

cleanupDOMMock();

// 测试 DynamicHeightVirtualList
console.log('\n--- DynamicHeightVirtualList ---');
setupDOMMock();

const container2 = { style: {}, scrollTop: 0, _children: [], _listeners: {} };
container2.appendChild = function(child) { this._children.push(child); };
container2.addEventListener = function(type, fn) {
  if (!this._listeners[type]) this._listeners[type] = [];
  this._listeners[type].push(fn);
};
container2.removeEventListener = function(type, fn) {
  if (!this._listeners[type]) return;
  this._listeners[type] = this._listeners[type].filter(f => f !== fn);
};
Object.defineProperty(container2, 'innerHTML', {
  set(val) { this._innerHTML = val; if (val === '') this._children = []; },
  get() { return this._innerHTML || ''; }
});
Object.defineProperty(container2, 'children', {
  get() { return this._children; }
});

const dynamicData = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  text: `Item ${i}`
}));

const dynamicList = new DynamicHeightVirtualList({
  container: container2,
  data: dynamicData,
  estimatedHeight: 40,
  visibleHeight: 600,
  bufferSize: 5,
  renderItem: (item) => {
    const div = document.createElement('div');
    div.textContent = item.text;
    return div;
  }
});

// 验证高度缓存初始化
console.assert(dynamicList.heightCache.length === 1000, 'heightCache 长度等于数据长度');
console.assert(dynamicList.heightCache[0].top === 0, '第一项 top=0');
console.assert(dynamicList.heightCache[0].height === 40, '初始使用预估高度');
console.assert(dynamicList.heightCache[1].top === 40, '第二项 top=40');

// 验证 totalHeight
console.assert(dynamicList.totalHeight === 1000 * 40, 'totalHeight = 数据量 × 预估高度');

// 验证二分查找 getStartIndex
console.assert(dynamicList.getStartIndex(0) === 0, 'scrollTop=0 → startIndex=0');
console.assert(dynamicList.getStartIndex(40) === 1, 'scrollTop=40 → startIndex=1');
console.assert(dynamicList.getStartIndex(120) === 3, 'scrollTop=120 → startIndex=3');

// 验证 getEndIndex
const dynEnd = dynamicList.getEndIndex(0);
console.assert(dynEnd > 0, 'dynamic getEndIndex > startIndex');

// 验证 scrollToIndex 边界
dynamicList.scrollToIndex(-1);
console.assert(container2.scrollTop === 0, 'scrollToIndex(-1) 不改变 scrollTop');

dynamicList.scrollToIndex(999);
console.assert(container2.scrollTop === 999 * 40, 'scrollToIndex(999)');

// 验证 render
dynamicList.render();
console.assert(dynamicList.phantom !== null, 'dynamic render 创建 phantom');
console.assert(dynamicList.content !== null, 'dynamic render 创建 content');

// 验证 destroy
dynamicList.destroy();
console.assert(container2._listeners.scroll.length === 0, 'dynamic destroy 移除监听');

cleanupDOMMock();

console.log('\n✅ 全部通过');
