const { treeToListDFS, treeToListBFS } = require('./solution.js');

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

const dfsResult = treeToListDFS(tree);
console.assert(dfsResult.length === 7, 'DFS: 结果数量正确');
console.assert(dfsResult[0].id === 1 && dfsResult[0].parentId === null, 'DFS: 根节点 parentId 为 null');
console.assert(dfsResult[1].id === 2 && dfsResult[1].parentId === 1, 'DFS: 子节点 parentId 正确');
console.assert(dfsResult[2].id === 5 && dfsResult[2].parentId === 2, 'DFS: 深层子节点 parentId 正确');

const dfsIds = dfsResult.map(n => n.id);
console.assert(JSON.stringify(dfsIds) === '[1,2,5,6,3,4,7]', 'DFS: 遍历顺序正确');

const bfsResult = treeToListBFS(tree);
console.assert(bfsResult.length === 7, 'BFS: 结果数量正确');

const bfsIds = bfsResult.map(n => n.id);
console.assert(JSON.stringify(bfsIds) === '[1,4,2,3,7,5,6]', 'BFS: 遍历顺序正确');

const hasChildren = dfsResult.some(n => 'children' in n);
console.assert(!hasChildren, '结果中不包含 children 字段');

console.assert(treeToListDFS(tree).length === treeToListBFS(tree).length, 'DFS 与 BFS 结果数量一致');

console.assert(JSON.stringify(treeToListDFS([])) === '[]', '空数组返回空数组');
console.assert(JSON.stringify(treeToListBFS([])) === '[]', '空数组 BFS 返回空数组');
console.assert(JSON.stringify(treeToListDFS(null)) === '[]', '非法输入返回空数组');
console.assert(JSON.stringify(treeToListBFS(null)) === '[]', '非法输入 BFS 返回空数组');

const single = treeToListDFS([{ id: 1, name: 'root' }]);
console.assert(single.length === 1 && single[0].parentId === null, '单节点 parentId 为 null');

const emptyChildren = treeToListDFS([{ id: 1, name: 'root', children: [] }]);
console.assert(emptyChildren.length === 1, 'children 为空数组时正常处理');

console.log('✅ 16-tree-to-list 全部通过');
