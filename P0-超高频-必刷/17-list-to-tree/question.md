> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 17 - 列表转树形结构

- **分类**：数据结构与算法 | **难度**：⭐⭐ | **考察点**：Map 索引、递归构建、数据结构转换

## 题目要求

实现函数 `listToTree(list)`，将带有 `parentId` 的扁平数组转换为带有 `children` 的树形结构。

### 函数签名

```javascript
/**
 * @param {Array<{id: number|string, parentId: number|string|null, [key: string]: any}>} list
 * @returns {Array<{id: number|string, children: Array, [key: string]: any}>}
 */
function listToTree(list) {}
```

## 示例

```javascript
const list = [
  { id: 1, parentId: null, name: '根节点' },
  { id: 2, parentId: 1, name: '子节点1' },
  { id: 3, parentId: 1, name: '子节点2' },
  { id: 4, parentId: 2, name: '孙节点1' },
];
listToTree(list);
// → [{ id: 1, name: '根节点', children: [
//     { id: 2, name: '子节点1', children: [
//       { id: 4, name: '孙节点1', children: [] }
//     ]},
//     { id: 3, name: '子节点2', children: [] }
//   ]}]
```

## 约束

1. **时间复杂度**：O(n)，使用 Map 建立索引，避免 O(n²) 双层循环
2. `parentId` 为 `null` 或 `undefined` 时表示根节点
3. 每个节点添加 `children` 数组（无子节点时为空数组）
4. 保留原始对象上的所有属性，不修改原始数据
5. 空数组返回空数组

## 加分项

- 考虑循环引用（parentId 形成环）如何处理
- 考虑子节点在父节点之前出现的情况
- 考虑 `id` 字段类型不一致的情况（如字符串 `"1"` vs 数字 `1`）
