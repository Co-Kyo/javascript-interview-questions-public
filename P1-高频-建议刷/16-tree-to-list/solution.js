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

module.exports = { treeToListDFS, treeToListBFS };
