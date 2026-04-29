const REPLACE = 'REPLACE';
const REMOVE = 'REMOVE';
const INSERT = 'INSERT';
const ATTRS = 'ATTRS';
const TEXT = 'TEXT';

function isTextNode(vnode) {
  return typeof vnode === 'string';
}

function diffAttrs(oldAttrs, newAttrs) {
  const patches = {};

  for (const key in newAttrs) {
    if (oldAttrs[key] !== newAttrs[key]) {
      patches[key] = newAttrs[key];
    }
  }

  for (const key in oldAttrs) {
    if (!(key in newAttrs)) {
      patches[key] = undefined;
    }
  }

  return Object.keys(patches).length > 0 ? patches : null;
}

function buildKeyMap(children) {
  const map = {};
  children.forEach((child) => {
    if (!isTextNode(child) && child.attrs && child.attrs.key != null) {
      map[child.attrs.key] = child;
    }
  });
  return map;
}

function hasKeyedChildren(oldChildren, newChildren) {
  const check = (child) => !isTextNode(child) && child.attrs && child.attrs.key != null;
  return newChildren.some(check) || oldChildren.some(check);
}

function diff(oldVNode, newVNode) {
  const patches = [];

  if (!oldVNode && !newVNode) {
    return patches;
  }

  if (oldVNode && !newVNode) {
    patches.push({ type: REMOVE, node: oldVNode });
    return patches;
  }

  if (!oldVNode && newVNode) {
    patches.push({ type: INSERT, node: newVNode });
    return patches;
  }

  if (isTextNode(oldVNode) || isTextNode(newVNode)) {
    if (isTextNode(oldVNode) && isTextNode(newVNode)) {
      if (oldVNode !== newVNode) {
        patches.push({ type: TEXT, text: newVNode });
      }
      return patches;
    }
    patches.push({ type: REPLACE, node: newVNode });
    return patches;
  }

  if (oldVNode.tag !== newVNode.tag) {
    patches.push({ type: REPLACE, node: newVNode });
    return patches;
  }

  const attrsPatch = diffAttrs(oldVNode.attrs || {}, newVNode.attrs || {});
  if (attrsPatch) {
    patches.push({ type: ATTRS, attrs: attrsPatch });
  }

  const childPatches = diffChildren(oldVNode.children || [], newVNode.children || []);
  if (childPatches.length > 0) {
    patches.push(...childPatches);
  }

  return patches;
}

function diffChildren(oldChildren, newChildren) {
  const patches = [];

  const useKeyStrategy = hasKeyedChildren(oldChildren, newChildren);

  if (useKeyStrategy) {
    const oldKeyMap = buildKeyMap(oldChildren);
    const usedOldKeys = new Set();

    newChildren.forEach((newChild) => {
      const newKey = !isTextNode(newChild) && newChild.attrs ? newChild.attrs.key : null;

      if (newKey != null && newKey in oldKeyMap) {
        const oldChild = oldKeyMap[newKey];
        const childPatch = diff(oldChild, newChild);
        patches.push(...childPatch);
        usedOldKeys.add(newKey);
      } else {
        patches.push({ type: INSERT, node: newChild });
      }
    });

    oldChildren.forEach((oldChild) => {
      const oldKey = !isTextNode(oldChild) && oldChild.attrs ? oldChild.attrs.key : null;
      if (oldKey != null && !usedOldKeys.has(oldKey)) {
        patches.push({ type: REMOVE, node: oldChild });
      }
    });
  } else {
    const maxLen = Math.max(oldChildren.length, newChildren.length);

    for (let i = 0; i < maxLen; i++) {
      if (i >= oldChildren.length) {
        patches.push({ type: INSERT, node: newChildren[i] });
      } else if (i >= newChildren.length) {
        patches.push({ type: REMOVE, node: oldChildren[i] });
      } else {
        const childPatch = diff(oldChildren[i], newChildren[i]);
        patches.push(...childPatch);
      }
    }
  }

  return patches;
}

module.exports = { diff, diffAttrs, diffChildren, REPLACE, REMOVE, INSERT, ATTRS, TEXT };
