const { diff, REPLACE, REMOVE, INSERT, ATTRS, TEXT } = require('./solution.js');

function assert(condition, msg) {
  if (!condition) {
    console.error('❌ ' + msg);
    process.exitCode = 1;
  } else {
    console.log('✅ ' + msg);
  }
}

function findPatch(patches, type) {
  return patches.filter(p => p.type === type);
}

// 标签不同 → REPLACE
const t1 = diff(
  { tag: 'div', attrs: {}, children: [] },
  { tag: 'span', attrs: {}, children: [] }
);
assert(t1.length === 1 && t1[0].type === REPLACE, '标签不同 → REPLACE');

// 属性变更
const t2 = diff(
  { tag: 'div', attrs: { class: 'old' }, children: [] },
  { tag: 'div', attrs: { class: 'new' }, children: [] }
);
assert(t2.length === 1 && t2[0].type === ATTRS && t2[0].attrs.class === 'new', '属性变更 → ATTRS');

// 属性无变更
const t2b = diff(
  { tag: 'div', attrs: { class: 'a' }, children: [] },
  { tag: 'div', attrs: { class: 'a' }, children: [] }
);
assert(t2b.length === 0, '属性无变更 → 无补丁');

// 属性删除
const t2c = diff(
  { tag: 'div', attrs: { class: 'a', id: 'x' }, children: [] },
  { tag: 'div', attrs: { class: 'a' }, children: [] }
);
assert(t2c.length === 1 && t2c[0].type === ATTRS && t2c[0].attrs.id === undefined, '属性删除 → ATTRS with undefined');

// 新增属性
const t2d = diff(
  { tag: 'div', attrs: {}, children: [] },
  { tag: 'div', attrs: { class: 'new' }, children: [] }
);
assert(t2d.length === 1 && t2d[0].attrs.class === 'new', '新增属性 → ATTRS');

// 文本节点变更
const t3 = diff(
  { tag: 'p', attrs: {}, children: ['Hello'] },
  { tag: 'p', attrs: {}, children: ['World'] }
);
assert(t3.length === 1 && t3[0].type === TEXT && t3[0].text === 'World', '文本变更 → TEXT');

// 文本节点无变更
const t3b = diff(
  { tag: 'p', attrs: {}, children: ['Same'] },
  { tag: 'p', attrs: {}, children: ['Same'] }
);
assert(t3b.length === 0, '文本无变更 → 无补丁');

// 节点删除
const t4 = diff(
  { tag: 'div', attrs: {}, children: [] },
  null
);
assert(t4.length === 1 && t4[0].type === REMOVE, '节点删除 → REMOVE');

// 节点新增
const t5 = diff(
  null,
  { tag: 'div', attrs: {}, children: [] }
);
assert(t5.length === 1 && t5[0].type === INSERT, '节点新增 → INSERT');

// 都为空
const t6 = diff(null, null);
assert(t6.length === 0, '都为空 → 无补丁');

// 文本和元素互换
const t7 = diff('hello', { tag: 'span', attrs: {}, children: [] });
assert(t7.length === 1 && t7[0].type === REPLACE, '文本→元素 → REPLACE');

const t7b = diff({ tag: 'span', attrs: {}, children: [] }, 'hello');
assert(t7b.length === 1 && t7b[0].type === REPLACE, '元素→文本 → REPLACE');

// key 识别的列表 diff
const t8 = diff(
  {
    tag: 'ul', attrs: {},
    children: [
      { tag: 'li', attrs: { key: 'a' }, children: ['A'] },
      { tag: 'li', attrs: { key: 'b' }, children: ['B'] },
    ]
  },
  {
    tag: 'ul', attrs: {},
    children: [
      { tag: 'li', attrs: { key: 'b' }, children: ['B changed'] },
      { tag: 'li', attrs: { key: 'c' }, children: ['C'] },
    ]
  }
);
const textPatches = findPatch(t8, TEXT);
const insertPatches = findPatch(t8, INSERT);
const removePatches = findPatch(t8, REMOVE);
assert(textPatches.length === 1 && textPatches[0].text === 'B changed', 'key diff: key=b 文本变更');
assert(insertPatches.length === 1 && insertPatches[0].node.attrs.key === 'c', 'key diff: key=c 新增');
assert(removePatches.length === 1 && removePatches[0].node.attrs.key === 'a', 'key diff: key=a 删除');

// 子节点新增（无 key）
const t9 = diff(
  { tag: 'ul', attrs: {}, children: [] },
  { tag: 'ul', attrs: {}, children: [{ tag: 'li', attrs: {}, children: ['First'] }] }
);
assert(t9.length === 1 && t9[0].type === INSERT, '子节点新增（无 key）');

// 子节点删除（无 key）
const t10 = diff(
  { tag: 'ul', attrs: {}, children: [{ tag: 'li', attrs: {}, children: ['A'] }] },
  { tag: 'ul', attrs: {}, children: [] }
);
assert(t10.length === 1 && t10[0].type === REMOVE, '子节点删除（无 key）');

// 深层嵌套 diff
const t11 = diff(
  { tag: 'div', attrs: {}, children: [
    { tag: 'ul', attrs: {}, children: [
      { tag: 'li', attrs: {}, children: ['Nested'] }
    ]}
  ]},
  { tag: 'div', attrs: {}, children: [
    { tag: 'ul', attrs: {}, children: [
      { tag: 'li', attrs: {}, children: ['Changed'] }
    ]}
  ]}
);
assert(t11.length === 1 && t11[0].type === TEXT && t11[0].text === 'Changed', '深层嵌套 diff');

// 相同节点无变更
const t12 = diff(
  { tag: 'div', attrs: { class: 'a' }, children: ['hello'] },
  { tag: 'div', attrs: { class: 'a' }, children: ['hello'] }
);
assert(t12.length === 0, '完全相同 → 无补丁');

console.log('\n✅ 全部通过');
