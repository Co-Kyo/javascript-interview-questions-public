/**
 * 虚拟 DOM diff 算法实现
 * 
 * 核心思路：
 * 1. 同层比较，不跨层移动（启发式策略，O(n) 复杂度）
 * 2. 递归比较节点树，生成补丁列表
 * 3. 支持 key 识别，优化列表 diff
 */

// ============ 补丁类型常量 ============
const REPLACE = 'REPLACE';   // 替换节点
const REMOVE = 'REMOVE';     // 删除节点
const INSERT = 'INSERT';     // 插入节点
const ATTRS = 'ATTRS';       // 属性变更
const TEXT = 'TEXT';         // 文本变更

// ============ 辅助函数 ============

/**
 * 判断节点是否为文本节点（纯字符串）
 */
function isTextNode(vnode) {
  return typeof vnode === 'string';
}

/**
 * 比较两个属性对象，返回差异属性（仅包含新增或变更的）
 * @returns {Object|null} 有差异返回变更对象，无差异返回 null
 */
function diffAttrs(oldAttrs, newAttrs) {
  const patches = {};

  // 检查新增或修改的属性
  for (const key in newAttrs) {
    if (oldAttrs[key] !== newAttrs[key]) {
      patches[key] = newAttrs[key];
    }
  }

  // 检查删除的属性（设为 undefined 表示删除）
  for (const key in oldAttrs) {
    if (!(key in newAttrs)) {
      patches[key] = undefined;
    }
  }

  // 有差异才返回
  return Object.keys(patches).length > 0 ? patches : null;
}

/**
 * 通过 key 构建子节点映射表
 * 将 children 数组转换为 { key: child } 的映射
 */
function buildKeyMap(children) {
  const map = {};
  children.forEach((child) => {
    if (!isTextNode(child) && child.attrs && child.attrs.key != null) {
      map[child.attrs.key] = child;
    }
  });
  return map;
}

/**
 * 判断子节点列表是否包含 key（检查新旧两侧）
 * @returns {boolean}
 */
function hasKeyedChildren(oldChildren, newChildren) {
  const check = (child) => !isTextNode(child) && child.attrs && child.attrs.key != null;
  return newChildren.some(check) || oldChildren.some(check);
}

// ============ 核心 diff 函数 ============

/**
 * 比较新旧虚拟 DOM 树，返回补丁操作列表
 * 
 * @param {Object|string|null} oldVNode - 旧虚拟节点
 * @param {Object|string|null} newVNode - 新虚拟节点
 * @returns {Array} 补丁操作列表，每个元素 { type, ...payload }
 */
function diff(oldVNode, newVNode) {
  const patches = [];

  // Case 0: 两者都为空 → 无变更
  if (!oldVNode && !newVNode) {
    return patches;
  }

  // Case 1: 节点被删除
  if (oldVNode && !newVNode) {
    patches.push({ type: REMOVE, node: oldVNode });
    return patches;
  }

  // Case 2: 节点被新增
  if (!oldVNode && newVNode) {
    patches.push({ type: INSERT, node: newVNode });
    return patches;
  }

  // Case 3: 旧节点或新节点是文本节点
  if (isTextNode(oldVNode) || isTextNode(newVNode)) {
    // 两者都是文本节点 → 比较文本内容
    if (isTextNode(oldVNode) && isTextNode(newVNode)) {
      if (oldVNode !== newVNode) {
        patches.push({ type: TEXT, text: newVNode });
      }
      return patches;
    }
    // 一个是文本一个是元素 → 整体替换
    patches.push({ type: REPLACE, node: newVNode });
    return patches;
  }

  // Case 4: tag 不同 → 整体替换（同层比较的核心：不尝试复用）
  if (oldVNode.tag !== newVNode.tag) {
    patches.push({ type: REPLACE, node: newVNode });
    return patches;
  }

  // Case 5: tag 相同 → 比较属性
  const attrsPatch = diffAttrs(oldVNode.attrs || {}, newVNode.attrs || {});
  if (attrsPatch) {
    patches.push({ type: ATTRS, attrs: attrsPatch });
  }

  // Case 6: 递归比较子节点
  const childPatches = diffChildren(oldVNode.children || [], newVNode.children || []);
  if (childPatches.length > 0) {
    patches.push(...childPatches);
  }

  return patches;
}

/**
 * 比较子节点列表（支持 key 识别的高效 diff）
 * 
 * 策略：
 * - 如果子节点有 key，使用 key 映射进行匹配（O(n) 查找）
 * - 如果没有 key，按顺序一一比较
 * 
 * @param {Array} oldChildren - 旧子节点列表
 * @param {Array} newChildren - 新子节点列表
 * @returns {Array} 子节点相关的补丁列表
 */
function diffChildren(oldChildren, newChildren) {
  const patches = [];

  // 检查新旧两侧是否有 key 节点（任一侧有 key 即使用 key 匹配策略）
  const useKeyStrategy = hasKeyedChildren(oldChildren, newChildren);

  if (useKeyStrategy) {
    // ===== Key 匹配策略 =====
    // 1. 用 key 建立旧节点的映射
    const oldKeyMap = buildKeyMap(oldChildren);

    // 2. 遍历新子节点，通过 key 查找对应旧节点
    const usedOldKeys = new Set();

    newChildren.forEach((newChild) => {
      const newKey = !isTextNode(newChild) && newChild.attrs ? newChild.attrs.key : null;

      if (newKey != null && newKey in oldKeyMap) {
        // 找到对应旧节点 → 递归 diff，直接展开补丁（不包裹 CHILD_DIFF）
        const oldChild = oldKeyMap[newKey];
        const childPatch = diff(oldChild, newChild);
        patches.push(...childPatch);
        usedOldKeys.add(newKey);
      } else {
        // 新节点没有对应旧节点 → 插入
        patches.push({ type: INSERT, node: newChild });
      }
    });

    // 3. 检查被删除的旧节点
    oldChildren.forEach((oldChild) => {
      const oldKey = !isTextNode(oldChild) && oldChild.attrs ? oldChild.attrs.key : null;
      if (oldKey != null && !usedOldKeys.has(oldKey)) {
        patches.push({ type: REMOVE, node: oldChild });
      }
    });
  } else {
    // ===== 无 key 的顺序比较策略 =====
    const maxLen = Math.max(oldChildren.length, newChildren.length);

    for (let i = 0; i < maxLen; i++) {
      if (i >= oldChildren.length) {
        // 新增的子节点
        patches.push({ type: INSERT, node: newChildren[i] });
      } else if (i >= newChildren.length) {
        // 多余的旧子节点 → 删除
        patches.push({ type: REMOVE, node: oldChildren[i] });
      } else {
        // 两者都存在 → 递归比较，直接展开补丁
        const childPatch = diff(oldChildren[i], newChildren[i]);
        patches.push(...childPatch);
      }
    }
  }

  return patches;
}

// ============ 测试用例 ============

// 示例 1：标签不同 → 替换
const test1Old = { tag: 'div', attrs: {}, children: [] };
const test1New = { tag: 'span', attrs: {}, children: [] };
console.log('Test 1 - 标签替换:', JSON.stringify(diff(test1Old, test1New), null, 2));

// 示例 2：属性变更
const test2Old = { tag: 'div', attrs: { class: 'old' }, children: [] };
const test2New = { tag: 'div', attrs: { class: 'new' }, children: [] };
console.log('Test 2 - 属性变更:', JSON.stringify(diff(test2Old, test2New), null, 2));

// 示例 3：文本节点变更
const test3Old = { tag: 'p', attrs: {}, children: ['Hello'] };
const test3New = { tag: 'p', attrs: {}, children: ['World'] };
console.log('Test 3 - 文本变更:', JSON.stringify(diff(test3Old, test3New), null, 2));

// 示例 4：key 识别的列表 diff
const test4Old = {
  tag: 'ul', attrs: {},
  children: [
    { tag: 'li', attrs: { key: 'a' }, children: ['A'] },
    { tag: 'li', attrs: { key: 'b' }, children: ['B'] },
  ]
};
const test4New = {
  tag: 'ul', attrs: {},
  children: [
    { tag: 'li', attrs: { key: 'b' }, children: ['B changed'] },
    { tag: 'li', attrs: { key: 'c' }, children: ['C'] },
  ]
};
console.log('Test 4 - key 列表 diff:', JSON.stringify(diff(test4Old, test4New), null, 2));

// 示例 5：子节点新增
const test5Old = { tag: 'ul', attrs: {}, children: [] };
const test5New = {
  tag: 'ul', attrs: {},
  children: [
    { tag: 'li', attrs: {}, children: ['First'] },
  ]
};
console.log('Test 5 - 子节点新增:', JSON.stringify(diff(test5Old, test5New), null, 2));

// 示例 6：边界 - null 输入
console.log('Test 6a - null→null:', JSON.stringify(diff(null, null), null, 2));
console.log('Test 6b - null→node:', JSON.stringify(diff(null, { tag: 'div', attrs: {}, children: [] }), null, 2));
console.log('Test 6c - node→null:', JSON.stringify(diff({ tag: 'div', attrs: {}, children: [] }, null), null, 2));

// 示例 7：深层嵌套 diff
const test7Old = {
  tag: 'div', attrs: {},
  children: [{
    tag: 'ul', attrs: {},
    children: [{ tag: 'li', attrs: {}, children: ['Nested'] }]
  }]
};
const test7New = {
  tag: 'div', attrs: {},
  children: [{
    tag: 'ul', attrs: {},
    children: [{ tag: 'li', attrs: {}, children: ['Changed'] }]
  }]
};
console.log('Test 7 - 深层嵌套:', JSON.stringify(diff(test7Old, test7New), null, 2));

// 导出供外部使用
module.exports = { diff, diffAttrs, diffChildren, REPLACE, REMOVE, INSERT, ATTRS, TEXT };
