function listToTree(list) {
  if (!Array.isArray(list) || list.length === 0) return [];

  const nodeMap = new Map();

  for (const item of list) {
    if (item.id == null) continue;
    nodeMap.set(item.id, { ...item, children: [] });
  }

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

  return tree;
}

module.exports = listToTree;
