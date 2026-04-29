/**
 * 23 - 图片懒加载 — 测试（模拟浏览器环境）
 * 运行：node test.js
 */

// --- 模拟浏览器环境 ---

class MockIntersectionObserver {
  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observed = [];
    this.disconnected = false;
  }
  observe(el) { this.observed.push(el); }
  unobserve(el) { this.observed = this.observed.filter(o => o !== el); }
  disconnect() { this.disconnected = true; this.observed = []; }
  simulateIntersect(target) {
    this.callback([{ isIntersecting: true, target }]);
  }
}

class MockElement {
  constructor(dataset = {}) {
    this.dataset = dataset;
    this.src = '';
    this.onload = null;
    this.onerror = null;
    this.classList = {
      _classes: new Set(),
      remove(cls) { this._classes.delete(cls); },
      add(cls) { this._classes.add(cls); },
    };
  }
  removeAttribute(key) { delete this.dataset[key]; }
}

let CurrentIO = MockIntersectionObserver;
global.window = {
  innerHeight: 800,
  addEventListener() {},
  removeEventListener() {},
  get IntersectionObserver() { return CurrentIO; },
};
global.IntersectionObserver = MockIntersectionObserver;
global.document = { querySelectorAll: () => [] };

const { lazyLoad } = require('./solution.js');

// --- 测试：无匹配元素 ---

const emptyResult = lazyLoad('.nonexistent');
console.assert(typeof emptyResult.destroy === 'function', '无匹配元素时返回带 destroy 的对象');
emptyResult.destroy();

// --- 测试：IntersectionObserver 方案 ---

const img1 = new MockElement({ src: 'real1.jpg' });
const img2 = new MockElement({ src: 'real2.jpg' });

global.document.querySelectorAll = (sel) => {
  if (sel === '.lazy') return [img1, img2];
  return [];
};

let capturedObserver = null;
const CapturedIO = class extends MockIntersectionObserver {
  constructor(cb, opts) {
    super(cb, opts);
    capturedObserver = this;
  }
};
global.IntersectionObserver = CapturedIO;
CurrentIO = CapturedIO;

const loader = lazyLoad('.lazy', { rootMargin: 100, threshold: 0.1 });

console.assert(capturedObserver !== null, 'IntersectionObserver 被创建');
console.assert(capturedObserver.observed.length === 2, '观察了 2 张图片');
console.assert(capturedObserver.options.rootMargin === '100px', 'rootMargin 正确传递');
console.assert(capturedObserver.options.threshold === 0.1, 'threshold 正确传递');

// 模拟 img1 进入视口
capturedObserver.simulateIntersect(img1);
console.assert(img1.src === 'real1.jpg', '进入视口后 src 被设置为 data-src 值');

// 模拟 img2 进入视口
capturedObserver.simulateIntersect(img2);
console.assert(img2.src === 'real2.jpg', '第二张图片也被加载');

// 测试 destroy
loader.destroy();
console.assert(capturedObserver.disconnected === true, 'destroy 后 observer 被断开');

console.log('✅ 全部通过');
