/**
 * 扁平列表转树形结构
 * 核心思路：用 Map 建立 id → 节点的索引，一次遍历完成父子挂载
 *
 * @param {Array<{id: number|string, parentId: number|string|null}>} list
 * @returns {Array} 树形结构
 */
function listToTree(list) {
  if (!Array.isArray(list) || list.length === 0) return [];

  // 第一步：建立 id → 节点的映射索引（Map 比 Object 更安全，避免原型链污染）
  const nodeMap = new Map();

  // 第二步：遍历列表，将每个节点拷贝一份并加入 Map，同时初始化 children
  for (const item of list) {
    if (item.id == null) continue; // 跳过缺少 id 的无效节点
    // 浅拷贝，避免修改原始数据；同时给每个节点加上 children 数组
    nodeMap.set(item.id, { ...item, children: [] });
  }

  // 第三步：遍历 Map，将每个节点挂载到其父节点的 children 下
  const tree = [];

  for (const node of nodeMap.values()) {
    if (node.parentId == null) {
      // parentId 为 null 或 undefined → 根节点，直接放入结果
      tree.push(node);
    } else {
      // 通过 Map 索引 O(1) 找到父节点，避免嵌套循环
      const parent = nodeMap.get(node.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // 父节点不存在（数据不完整或循环引用导致的孤立节点），记录警告
        console.warn(`[listToTree] 孤立节点 id=${node.id}，parentId=${node.parentId} 未找到`);
      }
    }
  }

  return tree;
}

// ==================== 测试用例 ====================

// 示例 1：基本用法
const list1 = [
  { id: 1, parentId: null, name: '根节点' },
  { id: 2, parentId: 1, name: '子节点1' },
  { id: 3, parentId: 1, name: '子节点2' },
  { id: 4, parentId: 2, name: '孙节点1' },
];
console.log('示例1:', JSON.stringify(listToTree(list1), null, 2));

// 示例 2：多个根节点
const list2 = [
  { id: 1, parentId: null, name: '菜单A' },
  { id: 2, parentId: null, name: '菜单B' },
  { id: 3, parentId: 1, name: '菜单A-1' },
];
console.log('示例2:', JSON.stringify(listToTree(list2), null, 2));

// 示例 3：子节点在父节点之前出现（乱序）
const list3 = [
  { id: 3, parentId: 1, name: '子节点' },
  { id: 1, parentId: null, name: '根节点' },
];
console.log('示例3（乱序）:', JSON.stringify(listToTree(list3), null, 2));

// 示例 4：空数组
console.log('示例4（空数组）:', listToTree([]));

// 示例 5：parentId 为 undefined 的情况
const list5 = [
  { id: 1, name: '无parentId字段' },
  { id: 2, parentId: 1, name: '子节点' },
];
console.log('示例5（undefined parentId）:', JSON.stringify(listToTree(list5), null, 2));

// 示例 6：id 类型不一致（string "1" vs number 1）
const list6 = [
  { id: 1, parentId: null, name: '根节点' },
  { id: '2', parentId: 1, name: '数字parentId' },
  { id: 3, parentId: '1', name: '字符串parentId（找不到父节点）' },
];
console.log('示例6（id类型不一致）:', JSON.stringify(listToTree(list6), null, 2));

// 示例 7：孤立节点（parentId 指向不存在的节点）
const list7 = [
  { id: 1, parentId: null, name: '根节点' },
  { id: 2, parentId: 999, name: '孤立节点' },
];
console.log('示例7（孤立节点）:', JSON.stringify(listToTree(list7), null, 2));

// 示例 8：循环引用（parentId 互相指向，所有节点都成孤立节点）
const list8 = [
  { id: 1, parentId: 2, name: '节点1' },
  { id: 2, parentId: 1, name: '节点2' },
];
console.log('示例8（循环引用）:', JSON.stringify(listToTree(list8), null, 2));
