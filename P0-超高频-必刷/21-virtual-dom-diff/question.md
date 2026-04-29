> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 21 - 虚拟 DOM diff 算法

- **分类**：DOM 与浏览器 API | **难度**：⭐⭐⭐⭐ | **考察点**：树比较、最小更新、递归 diff、key 的作用

## 题目要求

实现 `diff(oldVNode, newVNode)` 函数，比较两棵虚拟 DOM 树，返回补丁列表（patches）。

### 虚拟 DOM 节点结构

```javascript
const vnode = {
  tag: 'div',
  attrs: { id: 'app', class: 'container' },
  children: [
    { tag: 'span', attrs: {}, children: ['Hello'] },
    'World'  // 文本节点直接用字符串表示
  ]
}
```

### 补丁操作类型

| 类型 | 说明 |
|------|------|
| `REPLACE` | 替换整个节点（tag 不同或文本↔元素） |
| `REMOVE` | 删除节点 |
| `INSERT` | 插入新节点 |
| `ATTRS` | 属性变更 |
| `TEXT` | 文本内容变更 |

## 示例

```javascript
// 标签不同 → REPLACE
diff({ tag: 'div', attrs: {}, children: [] },
     { tag: 'span', attrs: {}, children: [] });
// → [{ type: 'REPLACE', node: { tag: 'span', ... } }]

// 属性变更 → ATTRS
diff({ tag: 'div', attrs: { class: 'old' }, children: [] },
     { tag: 'div', attrs: { class: 'new' }, children: [] });
// → [{ type: 'ATTRS', attrs: { class: 'new' } }]

// key 识别的列表 diff
diff(
  { tag: 'ul', attrs: {}, children: [
    { tag: 'li', attrs: { key: 'a' }, children: ['A'] },
    { tag: 'li', attrs: { key: 'b' }, children: ['B'] },
  ]},
  { tag: 'ul', attrs: {}, children: [
    { tag: 'li', attrs: { key: 'b' }, children: ['B changed'] },
    { tag: 'li', attrs: { key: 'c' }, children: ['C'] },
  ]}
);
// → TEXT(key=b), INSERT(key=c), REMOVE(key=a)
```

## 约束

1. **同层比较**：只比较同一层级的节点，不跨层移动
2. **支持 key 识别**：子节点带有 `key` 属性时，使用 key 匹配新旧节点
3. **文本节点**：子节点为纯字符串时视为文本节点

## 评分标准

| 等级 | 要求 |
|------|------|
| 及格 | 正确处理节点替换、属性变更、文本变更 |
| 良好 | 正确处理子节点的增删改，递归 diff |
| 优秀 | 支持 key 识别，实现高效的列表 diff 策略 |
