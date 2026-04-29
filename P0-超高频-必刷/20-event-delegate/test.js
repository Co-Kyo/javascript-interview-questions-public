const delegate = require('./solution.js');

function createMockElement(tagName, parent) {
  const el = {
    tagName: tagName.toUpperCase(),
    parentElement: parent || null,
    _listeners: {},
    textContent: '',
    matches(selector) {
      if (selector.startsWith('.')) return this.className && this.className.includes(selector.slice(1));
      if (selector.startsWith('#')) return this.id === selector.slice(1);
      return this.tagName === selector.toUpperCase();
    },
    addEventListener(type, fn) {
      if (!this._listeners[type]) this._listeners[type] = [];
      this._listeners[type].push(fn);
    },
    removeEventListener(type, fn) {
      if (!this._listeners[type]) return;
      this._listeners[type] = this._listeners[type].filter(f => f !== fn);
    },
    dispatchEvent(e) {
      const fns = this._listeners[e.type] || [];
      for (const fn of fns) fn(e);
    }
  };
  return el;
}

// 基本委托：点击子元素触发 handler
const ul = createMockElement('ul');
const li1 = createMockElement('li', ul);
li1.textContent = 'Item 1';
const li2 = createMockElement('li', ul);
li2.textContent = 'Item 2';

let clickedText = '';
const unbind = delegate(ul, 'li', 'click', function(e) {
  clickedText = this.textContent;
});

// 模拟点击 li1
const clickEvent1 = { type: 'click', target: li1 };
ul.dispatchEvent(clickEvent1);
console.assert(clickedText === 'Item 1', '基本委托：点击 li1 触发 handler');

// 模拟点击 li2
const clickEvent2 = { type: 'click', target: li2 };
ul.dispatchEvent(clickEvent2);
console.assert(clickedText === 'Item 2', '基本委托：点击 li2 触发 handler');

// 嵌套匹配：点击 li 的后代 span，应找到 li
const span = createMockElement('span', li1);
span.textContent = 'inner text';
li1.parentElement = ul;
span.parentElement = li1;

clickedText = '';
const clickEvent3 = { type: 'click', target: span };
ul.dispatchEvent(clickEvent3);
console.assert(clickedText === 'Item 1', '嵌套匹配：点击 span 应匹配到 li');

// unbind 移除监听
unbind();
clickedText = '';
const clickEvent4 = { type: 'click', target: li1 };
ul.dispatchEvent(clickEvent4);
console.assert(clickedText === '', 'unbind 后不再触发');

// 多次 unbind 不报错
unbind();
unbind();
console.assert(true, '多次 unbind 不报错');

// 动态添加的元素也能被委托
const ul2 = createMockElement('ul');
let dynamicText = '';
delegate(ul2, 'li', 'click', function(e) {
  dynamicText = this.textContent;
});

const newLi = createMockElement('li', ul2);
newLi.textContent = 'Dynamic Item';
ul2.dispatchEvent({ type: 'click', target: newLi });
console.assert(dynamicText === 'Dynamic Item', '动态添加的元素自动生效');

// selector 匹配 parent 本身
const div = createMockElement('div');
let parentMatched = false;
delegate(div, 'div', 'click', function(e) {
  parentMatched = true;
});
div.dispatchEvent({ type: 'click', target: div });
console.assert(parentMatched === true, 'selector 匹配 parent 本身');

// 不匹配的元素不触发
const ul3 = createMockElement('ul');
let triggered = false;
delegate(ul3, 'li', 'click', function(e) {
  triggered = true;
});
const div2 = createMockElement('div', ul3);
ul3.dispatchEvent({ type: 'click', target: div2 });
console.assert(triggered === false, '不匹配的元素不触发 handler');

console.log('✅ 全部通过');
