> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 17 - 列表转树形结构

## 基本信息

| 项目 | 内容 |
|------|------|
| 分类 | 数据结构与算法 |
| 难度 | ⭐⭐ |
| 考察点 | Map 索引、递归构建、数据结构转换 |

## 题目背景

在前端开发中，后端接口经常会返回扁平化的数据结构，例如菜单列表、权限树、组织架构等。这些数据在数据库中通常以 `parentId` 的方式存储父子关系，但前端渲染（如树形选择器、侧边栏菜单、组织架构图）需要树形嵌套结构。

你需要实现一个通用的转换函数，将扁平数组高效地转为树形结构。

## 题目要求

实现函数 `listToTree(list)`，将带有 `parentId` 的扁平数组转换为带有 `children` 的树形结构。

### 函数签名

```javascript
/**
 * @param {Array<{id: number|string, parentId: number|string|null, [key: string]: any}>} list
 * @returns {Array<{id: number|string, children: Array, [key: string]: any}>}
 */
function listToTree(list) {
  // 你的实现
}
```

### 输入输出示例

**示例 1：基本用法**

```javascript
const list = [
  { id: 1, parentId: null, name: '根节点' },
  { id: 2, parentId: 1, name: '子节点1' },
  { id: 3, parentId: 1, name: '子节点2' },
  { id: 4, parentId: 2, name: '孙节点1' },
];

const tree = listToTree(list);
// 期望输出:
// [
//   {
//     id: 1, name: '根节点', children: [
//       { id: 2, name: '子节点1', children: [
//         { id: 4, name: '孙节点1', children: [] }
//       ]},
//       { id: 3, name: '子节点2', children: [] }
//     ]
//   }
// ]
```

**示例 2：多个根节点**

```javascript
const list = [
  { id: 1, parentId: null, name: '菜单A' },
  { id: 2, parentId: null, name: '菜单B' },
  { id: 3, parentId: 1, name: '菜单A-1' },
];

listToTree(list);
// 期望输出:
// [
//   { id: 1, name: '菜单A', children: [
//     { id: 3, name: '菜单A-1', children: [] }
//   ]},
//   { id: 2, name: '菜单B', children: [] }
// ]
```

**示例 3：边界情况**

```javascript
// 空数组
listToTree([]); // → []

// parentId 为 undefined（视为根节点）
listToTree([{ id: 1, name: '无parentId字段' }]);
// → [{ id: 1, name: '无parentId字段', children: [] }]

// 孤立节点（parentId 指向不存在的 id）
listToTree([
  { id: 1, parentId: null, name: '根节点' },
  { id: 2, parentId: 999, name: '孤立节点' },
]);
// → [{ id: 1, name: '根节点', children: [] }]
// id=2 被静默丢弃（父节点不存在）
```

## 约束条件

1. **时间复杂度**：O(n)，必须在一次遍历中完成构建
2. **空间复杂度**：O(n)
3. **索引优化**：使用 `Map` 或 `Object` 建立索引，避免双层嵌套循环（O(n²)）
4. **数据兼容**：
   - `parentId` 为 `null` 或 `undefined` 时表示根节点
   - 保留原始对象上的所有属性
   - 每个节点都需要添加 `children` 数组（无子节点时为空数组）
5. **边界处理**：空数组返回空数组

## 加分项

- 考虑循环引用（parentId 形成环）如何处理
- 考虑子节点在父节点之前出现的情况
- 考虑 `id` 字段类型不一致的情况（如字符串 `"1"` vs 数字 `1`）
- 能否用非递归方式（迭代）实现
