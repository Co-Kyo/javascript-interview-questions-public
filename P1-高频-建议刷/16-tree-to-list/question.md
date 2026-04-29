> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# 16 - 树形结构转列表（拍平）

## 基本信息

| 属性 | 值 |
|------|-----|
| 分类 | 数据结构与算法 |
| 难度 | ⭐⭐ |
| 考察点 | 递归、DFS/BFS、树操作 |

## 背景

在前端开发中，树形结构数据非常常见：

- **菜单权限树**：后台管理系统的侧边栏菜单，通常以树形结构返回，渲染时需要展平为列表
- **组织架构树**：公司部门层级关系，查询某人所有下属时需要扁平化处理
- **文件目录树**：文件管理器中展示目录结构，搜索功能需要遍历所有节点
- **评论树**：嵌套回复的评论系统，渲染时需要知道每条评论的父级关系

这些场景的共同点：**后端返回树形数据，前端需要将其拍平为一维数组，同时保留父子关系信息**。

## 题目要求

实现一个函数 `treeToList(tree)`，将带 `children` 的树形结构拍平为一维数组，保留父子关系（通过 `parentId` 字段）。

### 函数签名

```javascript
/**
 * 将树形结构转为一维列表
 * @param {Array} tree - 树形结构数组
 * @param {string} idKey - 节点 id 字段名，默认 'id'
 * @param {string} childrenKey - 子节点字段名，默认 'children'
 * @returns {Array} 拍平后的一维数组，每个节点包含 parentId
 */

// 实际实现提供两种遍历方式：
function treeToListDFS(tree, idKey = 'id', childrenKey = 'children') { ... }
function treeToListBFS(tree, idKey = 'id', childrenKey = 'children') { ... }
```

### 输入示例

```javascript
const tree = [
  {
    id: 1,
    name: '系统管理',
    children: [
      {
        id: 2,
        name: '用户管理',
        children: [
          { id: 5, name: '用户列表' },
          { id: 6, name: '用户新增' }
        ]
      },
      { id: 3, name: '角色管理' }
    ]
  },
  {
    id: 4,
    name: '订单管理',
    children: [
      { id: 7, name: '订单列表' }
    ]
  }
];
```

### 输出示例

```javascript
[
  { id: 1, name: '系统管理', parentId: null },
  { id: 2, name: '用户管理', parentId: 1 },
  { id: 5, name: '用户列表', parentId: 2 },
  { id: 6, name: '用户新增', parentId: 2 },
  { id: 3, name: '角色管理', parentId: 1 },
  { id: 4, name: '订单管理', parentId: null },
  { id: 7, name: '订单列表', parentId: 4 }
]
```

## 边界用例

```javascript
// 空数组
treeToListDFS([])  // → []

// 单节点（无 children）
treeToListDFS([{ id: 1, name: 'root' }])
// → [{ id: 1, name: 'root', parentId: null }]

// children 为空数组
treeToListDFS([{ id: 1, name: 'root', children: [] }])
// → [{ id: 1, name: 'root', parentId: null }]

// 非法输入
treeToListDFS(null)  // → []
```

## 约束与要求

1. **必须支持 DFS（深度优先）和 BFS（广度优先）两种方式**
2. 根节点的 `parentId` 为 `null`
3. 拍平后的节点应保留原始数据的所有字段，额外添加 `parentId`
4. 原始数据中的 `children` 字段不需要保留在结果中
5. 树可能为空数组，应返回空数组
6. 树的层级和节点数量不限

## 进阶思考

1. DFS 和 BFS 两种方式输出的顺序有什么区别？
2. 如果树非常深（数千层），递归 DFS 会有什么问题？如何解决？
3. 如果需要反向操作（列表转树），思路是什么？
4. 如何根据 `parentId` 快速查找某个节点的所有子节点？
