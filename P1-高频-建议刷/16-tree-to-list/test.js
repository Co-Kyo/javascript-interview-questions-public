/**
 * 树形结构转列表 — 测试
 * 运行：node test.js
 */

const { treeToListDFS, treeToListBFS, treeToListDFSIterative, listToTree } = require('./solution.js');

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

// DFS 基本功能
const dfsResult = treeToListDFS(tree);
console.assert(dfsResult.length === 7, 'DFS: 结果数量正确');
console.assert(dfsResult[0].id === 1 && dfsResult[0].parentId === null, 'DFS: 根节点 parentId 为 null');
console.assert(dfsResult[1].id === 2 && dfsResult[1].parentId === 1, 'DFS: 子节点 parentId 正确');
console.assert(dfsResult[2].id === 5 && dfsResult[2].parentId === 2, 'DFS: 深层子节点 parentId 正确');

// DFS 遍历顺序：深度优先
const dfsIds = dfsResult.map(n => n.id);
console.assert(JSON.stringify(dfsIds) === '[1,2,5,6,3,4,7]', 'DFS: 遍历顺序正确');

// BFS 基本功能
const bfsResult = treeToListBFS(tree);
console.assert(bfsResult.length === 7, 'BFS: 结果数量正确');

// BFS 遍历顺序：广度优先
const bfsIds = bfsResult.map(n => n.id);
console.assert(JSON.stringify(bfsIds) === '[1,4,2,3,7,5,6]', 'BFS: 遍历顺序正确');

// 迭代 DFS
const iterResult = treeToListDFSIterative(tree);
const iterIds = iterResult.map(n => n.id);
console.assert(JSON.stringify(iterIds) === '[1,2,5,6,3,4,7]', '迭代 DFS: 遍历顺序与递归 DFS 一致');

// 结果中不包含 children 字段
const hasChildren = dfsResult.some(n => 'children' in n);
console.assert(!hasChildren, '结果中不包含 children 字段');

// 三种方式结果数量一致
console.assert(treeToListDFS(tree).length === treeToListBFS(tree).length, 'DFS 与 BFS 结果数量一致');
console.assert(treeToListDFS(tree).length === treeToListDFSIterative(tree).length, 'DFS 与迭代 DFS 结果数量一致');

// 边界：空数组
console.assert(JSON.stringify(treeToListDFS([])) === '[]', '空数组返回空数组');
console.assert(JSON.stringify(treeToListBFS([])) === '[]', '空数组 BFS 返回空数组');

// 边界：非法输入
console.assert(JSON.stringify(treeToListDFS(null)) === '[]', '非法输入返回空数组');
console.assert(JSON.stringify(treeToListBFS(null)) === '[]', '非法输入 BFS 返回空数组');

// 边界：单节点
const single = treeToListDFS([{ id: 1, name: 'root' }]);
console.assert(single.length === 1 && single[0].parentId === null, '单节点 parentId 为 null');

// 边界：children 为空数组
const emptyChildren = treeToListDFS([{ id: 1, name: 'root', children: [] }]);
console.assert(emptyChildren.length === 1, 'children 为空数组时正常处理');

// listToTree 反向还原
const flatList = treeToListDFS(tree);
const restored = listToTree(flatList);
console.assert(restored.length === 2, 'listToTree: 根节点数量正确');
console.assert(restored[0].children.length === 2, 'listToTree: 子节点挂载正确');
console.assert(restored[0].children[0].children.length === 2, 'listToTree: 深层子节点挂载正确');

// 自定义字段名
const customTree = [
  { key: 'a', label: 'A', items: [{ key: 'b', label: 'B' }] }
];
const customResult = treeToListDFS(customTree, 'key', 'items');
console.assert(customResult[0].key === 'a' && customResult[0].parentId === null, '自定义字段名: 根节点');
console.assert(customResult[1].key === 'b' && customResult[1].parentId === 'a', '自定义字段名: 子节点');

console.log('✅ 全部通过');
