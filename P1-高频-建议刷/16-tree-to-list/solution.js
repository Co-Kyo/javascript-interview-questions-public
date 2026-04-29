/**
 * 树形结构转列表（拍平）
 * 支持 DFS 和 BFS 两种方式
 */

// ============================================
// 方案一：DFS（深度优先遍历）- 递归实现
// ============================================
function treeToListDFS(tree, idKey = 'id', childrenKey = 'children') {
  // 输入校验
  if (!Array.isArray(tree)) return [];

  const result = [];

  function traverse(nodes, parentId) {
    if (!nodes || !nodes.length) return;

    for (const node of nodes) {
      // 构造新节点：保留所有原始字段，去掉 children，添加 parentId
      const { [childrenKey]: children, ...rest } = node;
      result.push({ ...rest, parentId });

      // 递归遍历子节点，当前节点 id 作为子节点的 parentId
      traverse(children, node[idKey]);
    }
  }

  traverse(tree, null);
  return result;
}

// ============================================
// 方案二：BFS（广度优先遍历）- 队列实现
// 使用索引代替 shift()，避免 O(n²) 性能问题
// ============================================
function treeToListBFS(tree, idKey = 'id', childrenKey = 'children') {
  // 输入校验
  if (!Array.isArray(tree)) return [];

  const result = [];
  // 用队列存储待处理节点，每个元素为 { node, parentId }
  const queue = tree.map(node => ({ node, parentId: null }));
  let head = 0; // 用索引代替 shift()，避免每次 O(n) 的数组重排

  while (head < queue.length) {
    // 从队首取出一个节点
    const { node, parentId } = queue[head++];

    // 构造新节点：保留原始字段，去掉 children，添加 parentId
    const { [childrenKey]: children, ...rest } = node;
    result.push({ ...rest, parentId });

    // 将子节点入队，当前节点 id 作为子节点的 parentId
    if (children && children.length) {
      for (const child of children) {
        queue.push({ node: child, parentId: node[idKey] });
      }
    }
  }

  return result;
}

// ============================================
// 方案三：迭代 DFS（避免深层递归栈溢出）
// ============================================
function treeToListDFSIterative(tree, idKey = 'id', childrenKey = 'children') {
  if (!Array.isArray(tree)) return [];

  const result = [];
  // 用显式栈模拟递归，栈中元素为 { node, parentId }
  const stack = [...tree].reverse().map(node => ({ node, parentId: null }));

  while (stack.length) {
    const { node, parentId } = stack.pop();
    const { [childrenKey]: children, ...rest } = node;
    result.push({ ...rest, parentId });

    if (children?.length) {
      // 反转后入栈，保证从左到右的遍历顺序
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push({ node: children[i], parentId: node[idKey] });
      }
    }
  }

  return result;
}

// ============================================
// 辅助：列表转树（与讲解中的延伸对应）
// ============================================
function listToTree(list, idKey = 'id', parentKey = 'parentId') {
  if (!Array.isArray(list)) return [];

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

// ============================================
// 测试
// ============================================
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

console.log('=== DFS 结果 ===');
console.log(JSON.stringify(treeToListDFS(tree), null, 2));

console.log('\n=== BFS 结果 ===');
console.log(JSON.stringify(treeToListBFS(tree), null, 2));

console.log('\n=== 迭代 DFS 结果 ===');
console.log(JSON.stringify(treeToListDFSIterative(tree), null, 2));

// 边界测试
console.log('\n=== 边界测试 ===');
console.log('空数组:', JSON.stringify(treeToListDFS([])));
console.log('空数组 BFS:', JSON.stringify(treeToListBFS([])));
console.log('非法输入:', JSON.stringify(treeToListDFS(null)));
console.log('单节点:', JSON.stringify(treeToListDFS([{ id: 1, name: 'root' }])));

// 列表转树验证
console.log('\n=== 列表转树 ===');
const flatList = treeToListDFS(tree);
console.log(JSON.stringify(listToTree(flatList), null, 2));

// 导出供其他模块使用
module.exports = { treeToListDFS, treeToListBFS, treeToListDFSIterative, listToTree };
