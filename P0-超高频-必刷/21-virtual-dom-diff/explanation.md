# 虚拟 DOM diff 算法 - 五步讲解

---

## 第一步：理解虚拟 DOM 与 diff 的核心思想

### 为什么需要 diff？

直接操作真实 DOM 的代价很高：
- 每次修改可能触发**重排（reflow）**和**重绘（repaint）**
- 浏览器需要重新计算样式、布局、绘制
- 频繁的 DOM 操作是性能瓶颈的核心来源

### 虚拟 DOM 的解决思路

```
状态变化 → 生成新虚拟 DOM → diff 新旧树 → 最小补丁 → 应用到真实 DOM
```

虚拟 DOM 本质上是一棵用 JavaScript 对象描述的轻量级 DOM 树：

```javascript
// 真实 DOM
<div id="app"><span>Hello</span></div>

// 虚拟 DOM
{ tag: 'div', attrs: { id: 'app' }, children: [
  { tag: 'span', attrs: {}, children: ['Hello'] }
]}
```

### 关键启发式：O(n³) → O(n)

理论上，两棵树的最小编辑距离（tree edit distance）算法复杂度为 **O(n³)**，这对大型 DOM 树来说完全不可接受。

React/Vue 采用了三个启发式假设，将复杂度降到 **O(n)**：

1. **同层比较**：只比较同一层级的节点，不跨层移动
2. **类型不同则替换**：tag 不同的节点不尝试复用，直接整棵子树替换
3. **key 标识**：通过 key 属性标识同一列表中的稳定节点

---

## 第二步：节点级比较 — 单节点 diff

两个虚拟节点的比较遵循以下决策树：

```
开始比较
  ├── 旧节点存在，新节点不存在 → REMOVE（删除）
  ├── 旧节点不存在，新节点存在 → INSERT（插入）
  ├── 都是文本节点 → 比较文本内容，不同则 TEXT 补丁
  ├── 一个是文本一个是元素 → REPLACE（替换）
  ├── tag 不同 → REPLACE（替换）
  └── tag 相同 → 比较属性（ATTRS）+ 递归比较子节点
```

### 属性比较的细节

```javascript
// 旧: { class: 'a', id: 'x', style: 'color:red' }
// 新: { class: 'b', id: 'x', onclick: 'fn()' }

// 结果：
// class: 'a' → 'b'  （变更）
// style: 'color:red' → undefined  （删除）
// onclick: 'fn()'  （新增）
// id: 'x'  （不变，不产生补丁）
```

---

## 第三步：子节点 diff — 无 key 的顺序比较

当子节点没有 key 时，采用**按索引顺序一一比较**的策略：

```
旧子节点:  [A, B, C, D]
新子节点:  [A', B', E]

比较过程:
  i=0: diff(A, A')  → 可能有属性/文本变更
  i=1: diff(B, B')  → 可能有属性/文本变更
  i=2: diff(C, E)   → tag不同则替换
  i=3: 旧节点D多余  → REMOVE
```

### 这种策略的问题

如果在列表头部插入一个元素：

```
旧: [A, B, C]
新: [X, A, B, C]
```

按索引比较会认为：
- A→X（替换）、B→A（替换）、C→B（替换）、新增C

产生了 3 个替换 + 1 个插入，而理想情况应该是 1 个插入。这就是为什么需要 **key**。

---

## 第四步：列表 diff — key 识别的高效策略

当子节点带有 key 时，使用 key 建立映射表进行智能匹配：

### 算法流程

```
1. 遍历旧子节点，建立 keyMap: { key → 旧节点 }

2. 遍历新子节点：
   ├── key 存在于 keyMap → 递归 diff 该节点
   └── key 不存在 → INSERT（新节点）

3. 遍历旧子节点：
   └── key 未被匹配 → REMOVE（多余节点）
```

### 用 key 解决上面的问题

```
旧: [{key:'a'}, {key:'b'}, {key:'c'}]
新: [{key:'x'}, {key:'a'}, {key:'b'}, {key:'c'}]

keyMap: { a→A, b→B, c→C }

遍历新节点:
  key='x' → 不在 keyMap → INSERT
  key='a' → 在 keyMap → diff(A, A) → 无变更
  key='b' → 在 keyMap → diff(B, B) → 无变更
  key='c' → 在 keyMap → diff(C, C) → 无变更

结果: 仅 1 个 INSERT，完美！
```

### 为什么不要用 index 作为 key？

```jsx
// ❌ 用 index 作为 key
{items.map((item, index) => <li key={index}>{item.name}</li>)}

// ✅ 用稳定的唯一标识
{items.map(item => <li key={item.id}>{item.name}</li>)}
```

当列表项顺序变化时，index 会重新分配，导致框架误判哪些节点可以复用，产生不必要的 DOM 操作，甚至触发组件状态错乱。

---

## 第五步：补丁类型汇总与执行

### 五种补丁类型

| 类型 | 触发条件 | 载荷 |
|------|---------|------|
| `REPLACE` | tag 不同 / 文本↔元素 | `{ type: 'REPLACE', node: 新节点 }` |
| `REMOVE` | 旧节点在新树中不存在 | `{ type: 'REMOVE' }` |
| `INSERT` | 新节点在旧树中不存在 | `{ type: 'INSERT', node: 新节点 }` |
| `ATTRS` | 属性有变更 | `{ type: 'ATTRS', attrs: { key: 值 } }` |
| `TEXT` | 文本内容变更 | `{ type: 'TEXT', text: 新文本 }` |

### 完整 diff 流程图

```
diff(oldVNode, newVNode)
│
├── 节点删除？ → [REMOVE]
├── 节点新增？ → [INSERT]
├── 文本节点？ → 比较文本 → [TEXT] 或 []
├── tag 不同？ → [REPLACE]
└── tag 相同
    ├── diffAttrs → [ATTRS]（如有差异）
    └── diffChildren
        ├── 有 key → key 匹配策略
        │   ├── key 匹配 → 递归 diff
        │   ├── key 无匹配 → [INSERT]
        │   └── 旧 key 多余 → [REMOVE]
        └── 无 key → 顺序比较策略
            ├── 两端都存在 → 递归 diff
            ├── 新多 → [INSERT]
            └── 旧多 → [REMOVE]
```

### 面试加分点

1. **React Fiber 架构**：将 diff 拆分为可中断的单元工作（时间切片），避免长任务阻塞主线程
2. **Vue 3 的最长递增子序列**：在双端 diff 基础上，用 LIS 算法最小化移动操作
3. **Svelte 的编译时优化**：跳过虚拟 DOM，直接在编译阶段生成精确的 DOM 更新代码
