# 17 - 列表转树形结构 · 五步讲解

## 第一步：理解问题本质

扁平列表中每个节点通过 `parentId` 指向其父节点，形成隐式的树结构。转换的目标是将这种隐式关系显式化——给每个节点添加 `children` 数组，把子节点塞进去。

**关键观察**：如果我们用暴力法（双重循环），对每个节点去列表里找它的子节点，时间复杂度是 O(n²)。这在数据量大时不可接受。

**核心思路**：牺牲空间换时间——第一个循环把所有节点存到 Map 里建立索引，第二个循环通过索引 O(1) 找到父节点并挂载。两个循环各自遍历 n 个元素，总计 O(n)。

## 第二步：建立 Map 索引

```javascript
const nodeMap = new Map();
for (const item of list) {
  if (item.id == null) continue;
  nodeMap.set(item.id, { ...item, children: [] });
}
```

**为什么用 Map 而不是 Object？**
- `Object` 的 key 只能是字符串，数字 id 会被隐式转换（`obj[1]` 实际是 `obj["1"]`），容易踩坑
- `Object` 可能受到原型链属性干扰（如 `toString`、`constructor` 等）
- `Map` 保留原始 key 类型，查找复杂度稳定 O(1)

**为什么用 `{ ...item, children: [] }` 浅拷贝？** 避免修改原始数据（不可变原则）。`item.id == null` 使用宽松比较，跳过缺少 id 的无效节点。

## 第三步：父子挂载

```javascript
const tree = [];
for (const node of nodeMap.values()) {
  if (node.parentId == null) {
    tree.push(node);
  } else {
    const parent = nodeMap.get(node.parentId);
    if (parent) {
      parent.children.push(node);
    }
  }
}
```

**关键细节**：
- `parentId == null` 使用宽松比较，同时匹配 `null` 和 `undefined`
- 通过 `nodeMap.get()` 在 O(1) 内找到父节点，避免了嵌套循环
- 如果父节点不存在（数据不完整），当前节点被静默丢弃

**为什么子节点可以先于父节点出现？** 因为我们在挂载阶段，所有节点都已经在 Map 里了。不管列表顺序如何，都能通过 id 找到对应的父节点。

## 第四步：处理边界情况

| 场景 | 处理方式 |
|------|----------|
| 空数组 | 函数开头直接返回 `[]` |
| 非数组输入 | `!Array.isArray(list)` 守卫，返回 `[]` |
| parentId 为 undefined | `== null` 宽松匹配，视为根节点 |
| 缺少 id 字段 | `item.id == null` 跳过无效节点 |
| 父节点不存在 | `if (parent)` 守卫，跳过该节点 |
| 多个根节点 | 循环中多个节点的 `parentId == null`，都会被 push 进 tree |
| 循环引用 | parentId 互指的节点自然成为孤立节点 |

## 第五步：复杂度分析

| 维度 | 复杂度 | 说明 |
|------|--------|------|
| 时间 | O(n) | 两个循环：建索引 O(n) + 挂载 O(n)，总计 O(n) |
| 空间 | O(n) | Map 存储 n 个节点引用，结果树也占用 O(n) |

**对比暴力法**：暴力法对每个节点遍历整个列表找子节点 → O(n²)。Map 索引将查找降为 O(1)，整体降为 O(n)。

## 常见追问

**Q：如果需要递归版怎么写？**

```javascript
function listToTreePureRecursive(list, parentId = null) {
  return list
    .filter(item => item.parentId === parentId)
    .map(item => ({
      ...item,
      children: listToTreePureRecursive(list, item.id),
    }));
}
```

纯递归版没有 Map 索引，每次 filter 都遍历整个列表，时间复杂度 O(n²)，但代码更直观。

**Q：如何检测循环引用？**

在标准 listToTree 中，循环引用的节点会导致所有环内节点都找不到有效根节点，最终被静默丢弃。如需主动检测，可在挂载后对每个根节点做 DFS，用 `visited` Set 记录路径上的节点 id，遇到重复即为环。

**Q：前端实际应用场景？**
- Ant Design / Element Plus 的 TreeSelect 组件需要树形数据
- 后台管理系统的侧边栏菜单渲染
- 权限管理中的角色-权限树
- 组织架构树形展示
