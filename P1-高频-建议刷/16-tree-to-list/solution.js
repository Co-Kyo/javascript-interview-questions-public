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

module.exports = { treeToListDFS, treeToListBFS, treeToListDFSIterative, listToTree };
