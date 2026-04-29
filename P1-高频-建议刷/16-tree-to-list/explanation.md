# 16 - 树形结构转列表 · 五步讲解

## 第一步：理解问题

**核心任务**：将树形结构「拍平」为一维数组，同时用 `parentId` 保留父子关系。

```
树形结构                          一维数组
  A                                [{id:A, parentId:null},
 / \                                {id:B, parentId:A},
B   C         ──────►               {id:D, parentId:B},
   / \                              {id:E, parentId:B},
  D   E                             {id:C, parentId:null}]
```

**关键点**：
- 每个节点需要知道「它的父节点是谁」
- 拍平后 `children` 字段不再需要
- 遍历顺序不同，结果数组的排列顺序不同

---

## 第二步：为什么 parentId 是核心

树形结构转列表的本质不是「遍历」，而是**用 parentId 重建父子关系**。遍历只是到达每个节点的手段，parentId 才是决定拍平后数据能否还原的关键。

```
❌ 没有 parentId：拍平后丢失了层级关系，无法还原
[
  { id: 'A', name: '系统管理' },
  { id: 'B', name: '用户管理' },
  { id: 'C', name: '角色管理' },
]
```

拍平后三个节点的层级关系完全丢失——无法判断 B 和 C 谁是 A 的子节点。

✅ 有 parentId：拍平后关系完整保留，随时可还原为树
[
  { id: 'A', name: '系统管理', parentId: null },
  { id: 'B', name: '用户管理', parentId: 'A' },
  { id: 'C', name: '角色管理', parentId: 'A' },
]
```

**parentId 决定的三件事**：

1. **层级关系**：`parentId === null` 的是根节点，其余挂在父节点下
2. **还原能力**：有了 parentId，可以随时用 `listToTree` 还原原始树形结构
3. **查询效率**：拍平后可以用 `filter(item => item.parentId === targetId)` 快速找到某节点的直接子节点

---

## 第三步：逐步实现

### 3.1 treeToListDFS — 递归 DFS

```javascript
function treeToListDFS(tree, idKey = 'id', childrenKey = 'children') {
  if (!Array.isArray(tree)) return [];

  const result = [];

  function traverse(nodes, parentId) {
    if (!nodes || !nodes.length) return;

    for (const node of nodes) {
      const { [childrenKey]: children, ...rest } = node;
      result.push({ ...rest, parentId });
      traverse(children, node[idKey]);
    }
  }

  traverse(tree, null);
  return result;
}
```

**`const { [childrenKey]: children, ...rest } = node`**：解构取出子节点数组（用于递归），同时用 rest 收集剩余属性（用于写入结果）。`[childrenKey]` 是计算属性名，支持动态字段名。

**`result.push({ ...rest, parentId })`**：保留原始字段，去掉 children，添加 parentId。

**`traverse(children, node[idKey])`**：递归遍历子节点，当前节点的 id 作为子节点的 parentId。根节点的 parentId 为 `null`，这是区分根节点和子节点的唯一标志。

**遍历顺序**：`1 → 2 → 5 → 6 → 3 → 4 → 7`，DFS 沿一条路径走到底再回溯，结果按「父子紧邻」排列。

### 3.2 treeToListBFS — 广度优先

```javascript
function treeToListBFS(tree, idKey = 'id', childrenKey = 'children') {
  if (!Array.isArray(tree)) return [];

  const result = [];
  const queue = tree.map(node => ({ node, parentId: null }));
  let head = 0;

  while (head < queue.length) {
    const { node, parentId } = queue[head++];
    const { [childrenKey]: children, ...rest } = node;
    result.push({ ...rest, parentId });

    if (children && children.length) {
      for (const child of children) {
        queue.push({ node: child, parentId: node[idKey] });
      }
    }
  }

  return result;
}
```

**`let head = 0`**：用索引代替 `queue.shift()`。`shift()` 每次需要 O(n) 重排数组，整体退化为 O(n²)；用索引访问是 O(1)，整体保持 O(n)。

**`queue[head++]`**：从队首取出节点，head 指针前移。

**遍历顺序**：`1 → 4 → 2 → 3 → 7 → 5 → 6`，BFS 逐层遍历，同层节点紧邻。

### 3.3 treeToListDFSIterative — 迭代 DFS（避免栈溢出）

```javascript
function treeToListDFSIterative(tree, idKey = 'id', childrenKey = 'children') {
  if (!Array.isArray(tree)) return [];

  const result = [];
  const stack = [...tree].reverse().map(node => ({ node, parentId: null }));

  while (stack.length) {
    const { node, parentId } = stack.pop();
    const { [childrenKey]: children, ...rest } = node;
    result.push({ ...rest, parentId });

    if (children?.length) {
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push({ node: children[i], parentId: node[idKey] });
      }
    }
  }

  return result;
}
```

**`[...tree].reverse()`**：反转后入栈，保证从左到右的遍历顺序（栈是后进先出）。

**`for (let i = children.length - 1; i >= 0; i--)`**：子节点逆序入栈，这样第一个子节点最后入栈、最先出栈，保持从左到右的顺序。

### 面试怎么选

| 维度 | DFS（递归） | BFS（队列） |
|------|------------|------------|
| 数据结构 | 调用栈（隐式） | 显式队列 |
| 遍历顺序 | 深度优先，父子紧邻 | 广度优先，同层紧邻 |
| 时间复杂度 | O(n) | O(n) |
| 空间复杂度 | O(h)，h 为树高 | O(w)，w 为最宽层节点数 |
| 栈溢出风险 | 树极深时有风险 | 无 |

---

## 第四步：常见追问

### Q1：如果节点有环怎么办？

用 `Set` 记录已访问的节点 id，遇到重复则跳过：

```javascript
function traverse(nodes, parentId, visited = new Set()) {
  for (const node of nodes) {
    if (visited.has(node[idKey])) continue;
    visited.add(node[idKey]);
    const { [childrenKey]: children, ...rest } = node;
    result.push({ ...rest, parentId });
    traverse(children, node[idKey], visited);
  }
}
```

### Q2：如果需要保留层级深度？

额外传入 `level` 参数，每递归一次 +1：

```javascript
function traverse(nodes, parentId, level = 0) {
  for (const node of nodes) {
    const { [childrenKey]: children, ...rest } = node;
    result.push({ ...rest, parentId, level });
    traverse(children, node[idKey], level + 1);
  }
}
```

### Q3：反向操作：列表转树

```javascript
function listToTree(list, idKey = 'id', parentKey = 'parentId') {
  const map = new Map();
  const result = [];

  for (const item of list) {
    map.set(item[idKey], { ...item, children: [] });
  }

  for (const item of list) {
    const node = map.get(item[idKey]);
    if (item[parentKey] === null || item[parentKey] === undefined) {
      result.push(node);
    } else {
      const parent = map.get(item[parentKey]);
      if (parent) parent.children.push(node);
    }
  }

  return result;
}
```

两遍扫描：第一遍建 `id → node` 的映射，第二遍挂载子节点。时间复杂度 O(n)。

### Q4：如何高效查找某个节点的所有子节点？

拍平后用 `filter(item => item.parentId === targetId)`，或预建 `parentId → children[]` 的 Map 索引。

---

## 第五步：易错点

| 易错点 | 说明 |
|-------|------|
| 忘记去掉 children 字段 | 结果中不应包含 children，否则不是真正的"拍平" |
| 根节点 parentId 不为 null | `listToTree` 还原时会找不到根 |
| BFS 用 shift() | 每次 O(n) 重排，整体退化为 O(n²)，应用索引 |
| 迭代 DFS 未反转子节点 | 入栈顺序错误导致遍历顺序与递归版不一致 |
| 未处理空数组/null 输入 | 应返回空数组而非报错 |