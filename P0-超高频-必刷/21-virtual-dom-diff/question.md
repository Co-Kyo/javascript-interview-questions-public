> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 21 - 虚拟 DOM diff 算法

## 基本信息

| 项目 | 内容 |
|------|------|
| 分类 | DOM 与浏览器 API |
| 难度 | ⭐⭐⭐⭐ |
| 考察点 | 树比较、最小更新、递归 diff、key 的作用 |

---

## 背景

React 和 Vue 等现代前端框架的核心性能机制之一就是**虚拟 DOM + diff 算法**。框架通过比较新旧两棵虚拟 DOM 树的差异，计算出最小的 DOM 操作集合，再批量应用到真实 DOM 上，从而避免昂贵的全量 DOM 更新。

理解 diff 算法，是理解框架渲染性能的关键。

---

## 虚拟 DOM 节点结构

```javascript
// 元素节点
const vnode = {
  tag: 'div',           // 标签名
  attrs: { id: 'app', class: 'container' },  // 属性
  children: [            // 子节点（可以是元素节点或文本节点）
    { tag: 'span', attrs: {}, children: ['Hello'] },
    'World'              // 文本节点直接用字符串表示
  ]
}
```

---

## 题目要求

实现一个 `diff(oldVNode, newVNode)` 函数，比较两棵虚拟 DOM 树，返回一个**补丁列表（patches）**。

### 补丁操作类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `REPLACE` | 替换整个节点 | tag 从 `div` 变为 `span` |
| `REMOVE` | 删除节点 | 旧节点在新树中不存在 |
| `INSERT` | 插入新节点 | 新树中出现了旧树没有的节点 |
| `ATTRS` | 属性变更 | `class` 从 `a` 变为 `b` |
| `TEXT` | 文本内容变更 | 文本从 `Hello` 变为 `Hi` |

### 约束条件

1. **同层比较**：只比较同一层级的节点，不跨层移动（React 的启发式策略）
2. **支持 key 识别**：如果子节点带有 `key` 属性，使用 key 来匹配新旧节点，提升列表 diff 效率
3. **文本节点**：子节点为纯字符串时视为文本节点

---

## 示例

### 示例 1：标签不同 → 替换

```javascript
const oldVNode = { tag: 'div', attrs: {}, children: [] };
const newVNode = { tag: 'span', attrs: {}, children: [] };
// 期望输出: [{ type: 'REPLACE', node: newVNode }]
```

### 示例 2：属性变更

```javascript
const oldVNode = { tag: 'div', attrs: { class: 'old' }, children: [] };
const newVNode = { tag: 'div', attrs: { class: 'new' }, children: [] };
// 期望输出: [{ type: 'ATTRS', attrs: { class: 'new' } }]
```

### 示例 3：子节点增删改（key 识别）

```javascript
const oldVNode = {
  tag: 'ul', attrs: {},
  children: [
    { tag: 'li', attrs: { key: 'a' }, children: ['A'] },
    { tag: 'li', attrs: { key: 'b' }, children: ['B'] },
  ]
};
const newVNode = {
  tag: 'ul', attrs: {},
  children: [
    { tag: 'li', attrs: { key: 'b' }, children: ['B changed'] },
    { tag: 'li', attrs: { key: 'c' }, children: ['C'] },
  ]
};
// 期望输出:
// [
//   { type: 'TEXT', text: 'B changed' },                        // key='b' 文本变更
//   { type: 'INSERT', node: { tag:'li', attrs:{key:'c'}, children:['C'] } },  // key='c' 新增
//   { type: 'REMOVE', node: { tag:'li', attrs:{key:'a'}, children:['A'] } }   // key='a' 删除
// ]
```

### 示例 4：文本节点变更

```javascript
const oldVNode = { tag: 'p', attrs: {}, children: ['Hello'] };
const newVNode = { tag: 'p', attrs: {}, children: ['World'] };
// 期望输出: [{ type: 'TEXT', text: 'World' }]
```

---

## 函数签名

```javascript
/**
 * 比较新旧虚拟 DOM 树，返回补丁列表
 * @param {Object|string|null} oldVNode - 旧虚拟节点
 * @param {Object|string|null} newVNode - 新虚拟节点
 * @returns {Array} 补丁操作列表
 */
function diff(oldVNode, newVNode) {
  // 你的实现
}
```

---

## 评分标准

| 等级 | 要求 |
|------|------|
| 及格 | 正确处理节点替换、属性变更、文本变更 |
| 良好 | 正确处理子节点的增删改，递归 diff |
| 优秀 | 支持 key 识别，实现高效的列表 diff 策略 |

---

## 进阶思考

1. 为什么 React 选择同层比较而不是跨层比较？时间复杂度差异是多少？
2. 为什么在列表渲染中不推荐使用 index 作为 key？
3. Vue 2 的双端 diff 和 React 的单链表 diff 各有什么优劣？
