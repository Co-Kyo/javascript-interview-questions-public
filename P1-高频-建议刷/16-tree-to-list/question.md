> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# 16 - 树形结构转列表（拍平）

## 基本信息

| 属性 | 值 |
|------|-----|
| 分类 | 数据结构与算法 |
| 难度 | ⭐⭐ |
| 考察点 | 递归、DFS/BFS、树操作 |

## 背景

前端常见场景：后端返回菜单权限树、组织架构树等树形数据，前端需要将其拍平为一维数组（同时保留父子关系）用于渲染列表、搜索等。

## 题目

实现 `treeToListDFS(tree)` 和 `treeToListBFS(tree)`，将带 `children` 的树形结构拍平为一维数组，通过 `parentId` 保留父子关系。

- 根节点的 `parentId` 为 `null`
- 结果保留原始数据所有字段，去掉 `children`，额外添加 `parentId`
- 空数组返回空数组，非法输入返回空数组

```javascript
const tree = [
  {
    id: 1, name: '系统管理',
    children: [
      {
        id: 2, name: '用户管理',
        children: [
          { id: 5, name: '用户列表' },
          { id: 6, name: '用户新增' }
        ]
      },
      { id: 3, name: '角色管理' }
    ]
  },
  {
    id: 4, name: '订单管理',
    children: [{ id: 7, name: '订单列表' }]
  }
];

treeToListDFS(tree);
// → [{id:1, name:'系统管理', parentId:null},
//    {id:2, name:'用户管理', parentId:1},
//    {id:5, name:'用户列表', parentId:2},
//    {id:6, name:'用户新增', parentId:2},
//    {id:3, name:'角色管理', parentId:1},
//    {id:4, name:'订单管理', parentId:null},
//    {id:7, name:'订单列表', parentId:4}]
```

## 约束与要求

1. 必须支持 DFS（深度优先）和 BFS（广度优先）两种方式
2. 支持自定义 `idKey` 和 `childrenKey` 字段名
3. 树的层级和节点数量不限

## 进阶思考

1. DFS 和 BFS 输出顺序有什么区别？
2. 如果树非常深（数千层），递归 DFS 会有什么问题？如何用迭代栈解决？（口头讨论思路即可）
3. 如何反向操作（列表转树）？（口头讨论思路即可）