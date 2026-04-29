# 16 - 树形结构转列表 · 五步讲解

## 第一步：理解问题

**核心任务**：将树形结构「拍平」为一维数组，同时用 `parentId` 保留父子关系。

**数据转换的本质**：

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

**有 parentId vs 无 parentId**：

```javascript
// ❌ 没有 parentId：拍平后丢失了层级关系，无法还原
[
  { id: 'A', name: '系统管理' },
  { id: 'B', name: '用户管理' },
  { id: 'C', name: '角色管理' },
  // 这三个节点现在是平级的？谁是谁的子节点？不知道了
]

// ✅ 有 parentId：拍平后关系完整保留，随时可还原为树
[
  { id: 'A', name: '系统管理', parentId: null },
  { id: 'B', name: '用户管理', parentId: 'A' },
  { id: 'C', name: '角色管理', parentId: 'A' },
  // parentId: 'A' 明确表示 B、C 是 A 的子节点
]
```

**parentId 决定的三件事**：

1. **层级关系**：`parentId === null` 的是根节点，其余挂在父节点下
2. **还原能力**：有了 parentId，可以随时用 `listToTree` 还原原始树形结构
3. **查询效率**：拍平后可以用 `filter(item => item.parentId === targetId)` 快速找到某节点的直接子节点，比遍历树更高效

**面试关键认知**：面试官考察的不是「你会不会遍历树」，而是「你理解拍平操作的本质是什么」。遍历方案（DFS/BFS）是实现手段，parentId 才是架构设计的核心。

---

## 第三步：完整实现 treeToList

### 基础版（递归 DFS）

```javascript
/**
 * 树形结构转列表（拍平）
 * @param {Array} tree - 树形数据
 * @param {string} idKey - 节点 id 字段名，默认 'id'
 * @param {string} childrenKey - 子节点字段名，默认 'children'
 * @returns {Array} 拍平后的列表，每个节点带 parentId
 */
function treeToList(tree, idKey = 'id', childrenKey = 'children') {
  const result = [];

  function traverse(nodes, parentId) {
    for (const node of nodes) {
      const { [childrenKey]: children, ...rest } = node;
      result.push({ ...rest, parentId });
      if (children?.length) {
        traverse(children, node[idKey]);
      }
    }
  }

  traverse(tree, null);
  return result;
}
```

**遍历顺序**（对应测试用例）：

```
系统管理(1) → 用户管理(2) → 用户列表(5) → 用户新增(6) → 角色管理(3) → 订单管理(4) → 订单列表(7)
```

DFS 沿一条路径走到底再回溯，结果按「父子紧邻」排列。

### BFS 版（广度优先）

```javascript
function treeToListBFS(tree, idKey = 'id', childrenKey = 'children') {
  const result = [];
  const queue = tree.map(node => ({ node, parentId: null }));
  let head = 0; // 用索引代替 shift()，避免 O(n²)

  while (head < queue.length) {
    const { node, parentId } = queue[head++];
    const { [childrenKey]: children, ...rest } = node;
    result.push({ ...rest, parentId });

    if (children?.length) {
      for (const child of children) {
        queue.push({ node: child, parentId: node[idKey] });
      }
    }
  }

  return result;
}
```

**遍历顺序**：

```
系统管理(1) → 订单管理(4) → 用户管理(2) → 角色管理(3) → 订单列表(7) → 用户列表(5) → 用户新增(6)
```

BFS 逐层遍历，同层节点紧邻，适合按层级展示的场景。

### 面试怎么选

| 维度 | DFS（递归） | BFS（队列） |
|------|------------|------------|
| 数据结构 | 调用栈（隐式） | 显式队列 |
| 遍历顺序 | 深度优先，父子紧邻 | 广度优先，同层紧邻 |
| 时间复杂度 | O(n) | O(n)（索引优化后） |
| 空间复杂度 | O(h)，h 为树高 | O(w)，w 为最宽层的节点数 |
| 栈溢出风险 | 树极深时有风险 | 无 |
| 代码简洁度 | 更简洁 | 稍复杂但更直观 |

**面试加分点**：能说出两种方案在不同场景下的取舍，而不是只给出一种解法。

**性能提醒**：BFS 实现中，用 `queue.shift()` 每次需 O(n) 重排数组，整体退化为 O(n²)。改用 `head` 索引可保持 O(n)。

---

## 第四步：关键实现细节

### 1. 解构去 children 的技巧

```javascript
const { [childrenKey]: children, ...rest } = node;
```

这行代码做了两件事：
- `children` 取出子节点数组（用于递归/入队）
- `rest` 是去掉 children 后的剩余属性（用于写入结果）

**注意**：`childrenKey` 是动态字段名，需要用计算属性名 `[childrenKey]`，不能直接写 `children`。

### 2. parentId 的传递时机

```javascript
// 递归 DFS：传入当前节点的 id 作为子节点的 parentId
traverse(children, node[idKey]);

// BFS：入队时记录 parentId
queue.push({ node: child, parentId: node[idKey] });
```

关键：parentId 在**处理子节点时**设置，不是在处理当前节点时。当前节点的 parentId 由它的父节点决定。

### 3. 根节点的 parentId

根节点的 parentId 必须是 `null`（或 `undefined`），这是区分根节点和子节点的唯一标志。如果根节点也有 parentId，`listToTree` 还原时会找不到根。

---

## 第五步：进阶与延伸

### 1. 反向操作：列表转树

```javascript
function listToTree(list, idKey = 'id', parentKey = 'parentId') {
  const map = new Map();
  const result = [];

  // 第一遍：建立 id → node 的映射
  for (const item of list) {
    map.set(item[idKey], { ...item, children: [] });
  }

  // 第二遍：挂载子节点
  for (const item of list) {
    const node = map.get(item[idKey]);
    if (item[parentKey] === null || item[parentKey] === undefined) {
      result.push(node);           // 根节点
    } else {
      const parent = map.get(item[parentKey]);
      if (parent) parent.children.push(node);  // 挂到父节点下
    }
  }

  return result;
}
```

### 2. 迭代 DFS（避免栈溢出）

对于极深的树，可以用迭代版 DFS 避免栈溢出：

```javascript
function treeToListDFSIterative(tree, idKey = 'id', childrenKey = 'children') {
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

### 3. 面试常见追问

- **Q：如果节点有环怎么办？** → 用 `Set` 记录已访问的节点 id，遇到重复则跳过
- **Q：如果需要保留层级深度？** → 额外传入 `level` 参数，每递归一次 +1
- **Q：如何高效查找某个节点的所有子节点？** → 拍平后用 `filter(item => item.parentId === targetId)`，或预建 `parentId → children[]` 的 Map 索引
- **Q：实际项目中怎么选？** → 树不深选 DFS（代码简洁），树深但不宽选 BFS（无栈溢出风险），需要按层级展示选 BFS
