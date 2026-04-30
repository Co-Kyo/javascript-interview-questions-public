# 08 - 数组扁平化 flat（支持指定深度）— 五步讲解

---

## 第一步：理解问题本质

**数组扁平化 = 递归地将嵌套数组"展平"为一维数组。**

核心变量只有一个：**深度（depth）**，它控制"还能再展开几层"。

```
depth = 0  →  不展开，返回浅拷贝
depth = 1  →  只展开最外层
depth = 2  →  展开两层
depth = Infinity  →  一直展开，直到没有嵌套数组
```

类比：把一个文件夹层级结构"拍平"——`depth` 决定你愿意展开几层子文件夹。

---

## 第二步：递归版思路

递归是最直觉的解法：**遍历数组，遇到子数组就递归展开，否则直接放入结果。**

```javascript
function _flatten(arr, depth, result, startIdx) {
  let writeIdx = startIdx;

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];

    if (Array.isArray(item) && depth > 0) {
      const count = _flatten(item, depth - 1, result, writeIdx);
      writeIdx += count;
    } else {
      result[writeIdx] = item;
      writeIdx++;
    }
  }

  return writeIdx - startIdx;
}
```

> ⚠️ **注意**：以上为简化版，省略了稀疏数组处理。完整的稀疏数组逻辑见第三步。

`depth - 1`：每递归一层，深度减 1。`depth = 0` 时不再递归，子数组整体保留。返回写入数量，让父级知道结果数组的下一个写入位置。

---

## 第三步：稀疏数组处理

**这是本题最容易踩坑的地方。**

稀疏数组有"空槽"（empty slot），与 `undefined` 不同：

```javascript
const sparse = [1, , 3];

0 in sparse
1 in sparse
2 in sparse

const normal = [1, undefined, 3];
1 in normal
```

上面代码的返回值分别是 `true`、`false`、`true`、`true`。索引 0 和 2 有值所以返回 `true`，索引 1 是空槽所以返回 `false`；而普通数组中 `undefined` 是有值的，所以 `1 in normal` 返回 `true`。

`for` 循环遍历稀疏数组时，空槽会被跳过（循环体不执行）。因此必须用 `in` 操作符主动检测空槽：

```javascript
if (!(i in arr)) {
  writeIdx++;
  result.length = writeIdx;
  continue;
}
```

`result.length = writeIdx` 扩展数组长度但不赋值，从而产生空槽。原生 `flat()` 的行为就是保留空槽、不填充 `undefined`，我们的实现要对齐这个行为。

---

## 第四步：复杂度分析

### 时间复杂度

| 方案 | 时间复杂度 | 说明 |
|------|-----------|------|
| 递归版 | O(n) | n = 所有元素总数（含嵌套），每个元素访问一次 |

### 空间复杂度

| 方案 | 空间复杂度 | 说明 |
|------|-----------|------|
| 递归版 | O(d + n) | d = 最大嵌套深度（调用栈），n = 结果数组 |

### 常见追问

1. **Q：reduce 版怎么做？**
   A：口头讨论方向——用 `reduce` 遍历数组，累加器是结果数组。遇到子数组时递归调用 `myFlat` 并用 `push(...spread)` 合并。注意：此方式会将稀疏数组空槽填充为 `undefined`，与原生 `flat()` 行为不同，面试中可作为讨论点。

2. **Q：`flat` 和 `flatMap` 的区别？**
   A：`flatMap` = 先 `map` 再 `flat(1)`，只展开一层。

3. **Q：如何处理类数组对象？**
   A：先用 `Array.from()` 转换为真数组，或用 `Array.isArray()` 严格判断。

4. **Q：原生 `flat` 在不同引擎的性能差异？**
   A：V8 (Chrome/Node) 的原生实现经过高度优化（C++ 层面），通常比手写 JS 快 2-5 倍。面试中讨论"何时该用原生 vs 手写"是加分项。
