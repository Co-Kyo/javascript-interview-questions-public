/**
 * 08 - 数组扁平化 flat（支持指定深度）
 *
 * 实现 Array.prototype.myFlat(depth)，支持：
 * - 指定深度扁平化
 * - Infinity 完全展开
 * - 稀疏数组保留空槽
 * - 不使用原生 Array.prototype.flat
 */

// ============================================================
// 方案一：递归版（基于 reduce）
// ============================================================

Array.prototype.myFlat = function (depth = 1) {
  // 边界：depth 为负数或 NaN 时，按 0 处理（返回浅拷贝）
  if (depth !== depth) depth = 0; // NaN 检测
  if (depth < 0) depth = 0;

  // 递归辅助函数：负责处理当前层级的元素
  // arr     — 待处理的数组
  // d       — 剩余可展开深度
  // result  — 收集结果的数组
  // startIdx— 当前写入 result 的起始索引
  //
  // 返回值：本次写入的元素个数（用于父级计算下一个写入位置）
  function _flatten(arr, d, result, startIdx) {
    let writeIdx = startIdx;

    for (let i = 0; i < arr.length; i++) {
      // ---- 稀疏数组处理 ----
      // `in` 操作符可以区分"空槽"和"值为 undefined 的属性"
      // 空槽：'0' in [ , ] → false
      // 显式 undefined：'0' in [undefined] → true
      if (!(i in arr)) {
        // 保留空槽：在 result 中制造一个对应的空槽
        writeIdx++;                  // 跳过一个位置
        result.length = writeIdx;    // 扩展 result 长度但不赋值 → 产生空槽
        continue;
      }

      const item = arr[i];

      // ---- 递归展开逻辑 ----
      if (Array.isArray(item) && d > 0) {
        // 当前元素是数组，且还有剩余展开深度 → 递归展开
        const count = _flatten(item, d - 1, result, writeIdx);
        writeIdx += count;
      } else {
        // 非数组元素，或深度已耗尽 → 直接放入 result
        result[writeIdx] = item;
        writeIdx++;
      }
    }

    // 返回本次写入的元素总数，供父级计算写入偏移
    return writeIdx - startIdx;
  }

  // 浅拷贝 + 递归展开（depth=0 时只拷贝不展开）
  const result = [];
  _flatten(this, depth, result, 0);
  return result;
};


// ============================================================
// 方案一-bis：递归版（基于 reduce）— 更简洁但稀疏处理需额外注意
// ============================================================

Array.prototype.myFlatReduce = function (depth = 1) {
  if (depth !== depth) depth = 0;
  if (depth < 0) depth = 0;

  return this.reduce((acc, item) => {
    if (Array.isArray(item) && depth > 0) {
      // 递归展开子数组，用扩展运算符合并结果
      acc.push(...item.myFlatReduce(depth - 1));
    } else {
      acc.push(item);
    }
    return acc;
  }, []);
};


// ============================================================
// 方案二：迭代版（显式栈模拟递归）
// ============================================================

Array.prototype.myFlatIterative = function (depth = 1) {
  if (depth !== depth) depth = 0;
  if (depth < 0) depth = 0;

  // 栈中每一项记录：[待处理数组, 当前索引, 剩余展开深度]
  // 从根数组的索引 0 开始
  const stack = [[this, 0, depth]];
  const result = [];

  while (stack.length > 0) {
    // 取出栈顶（不弹出，后续还要回来继续遍历）
    const top = stack[stack.length - 1];
    const [arr, idx, d] = top;

    // 当前数组已遍历完毕 → 弹出栈顶，回到父级
    if (idx >= arr.length) {
      stack.pop();
      continue;
    }

    // 推进当前数组的索引
    top[1]++;

    // ---- 稀疏数组处理 ----
    if (!(idx in arr)) {
      // 在 result 中制造空槽
      result.length = result.length + 1;
      continue;
    }

    const item = arr[idx];

    if (Array.isArray(item) && d > 0) {
      // 遇到子数组且还有深度 → 压栈，开始处理子数组
      stack.push([item, 0, d - 1]);
    } else {
      // 非数组或深度耗尽 → 直接写入 result
      result.push(item);
    }
  }

  return result;
};


// ============================================================
// 测试用例
// ============================================================

function runTests() {
  console.log('=== 递归版测试 ===\n');

  // 基本功能
  console.log('[1,[2,[3,[4]]]].myFlat(1)  =>', JSON.stringify([1,[2,[3,[4]]]].myFlat(1)));
  // 预期: [1,2,[3,[4]]]

  console.log('[1,[2,[3,[4]]]].myFlat(Infinity)  =>', JSON.stringify([1,[2,[3,[4]]]].myFlat(Infinity)));
  // 预期: [1,2,3,4]

  console.log('[1,[2,[3,[4]]]].myFlat(2)  =>', JSON.stringify([1,[2,[3,[4]]]].myFlat(2)));
  // 预期: [1,2,3,[4]]

  console.log('[1,[2,[3]]].myFlat(0)  =>', JSON.stringify([1,[2,[3]]].myFlat(0)));
  // 预期: [1,[2,[3]]]

  // 稀疏数组
  const sparse = [1, , [2, , 3]];
  const sparseResult = sparse.myFlat(1);
  console.log('\n稀疏数组 [1, ,[2, ,3]].myFlat(1):');
  console.log('  结果长度:', sparseResult.length);
  console.log('  索引0:', sparseResult[0]);           // 1
  console.log('  索引1存在:', 1 in sparseResult);      // false（空槽）
  console.log('  索引2:', sparseResult[2]);             // 2
  console.log('  索引3存在:', 3 in sparseResult);       // false（空槽）
  console.log('  索引4:', sparseResult[4]);             // 3

  // 边界情况
  console.log('\n[].myFlat(Infinity)  =>', JSON.stringify([].myFlat(Infinity)));
  // 预期: []

  console.log('[1,2,3].myFlat(1)  =>', JSON.stringify([1,2,3].myFlat(1)));
  // 预期: [1,2,3]

  console.log('[[[], [[]]]].myFlat(Infinity)  =>', JSON.stringify([[[], [[]]]].myFlat(Infinity)));
  // 预期: []

  // depth 为 NaN
  console.log('[1,[2]].myFlat(NaN)  =>', JSON.stringify([1,[2]].myFlat(NaN)));
  // 预期: [1,[2]]

  // depth 为负数
  console.log('[1,[2]].myFlat(-1)  =>', JSON.stringify([1,[2]].myFlat(-1)));
  // 预期: [1,[2]]

  // 不修改原数组
  const original = [1, [2, [3]]];
  const flattened = original.myFlat(Infinity);
  console.log('\n原数组未被修改:', JSON.stringify(original) === '[1,[2,[3]]]');

  console.log('\n=== 迭代版测试 ===\n');

  console.log('[1,[2,[3,[4]]]].myFlatIterative(1)  =>', JSON.stringify([1,[2,[3,[4]]]].myFlatIterative(1)));
  console.log('[1,[2,[3,[4]]]].myFlatIterative(Infinity)  =>', JSON.stringify([1,[2,[3,[4]]]].myFlatIterative(Infinity)));
  console.log('[[[], [[]]]].myFlatIterative(Infinity)  =>', JSON.stringify([[[], [[]]]].myFlatIterative(Infinity)));

  // 迭代版稀疏数组
  const sparseResult2 = [1, , [2, , 3]].myFlatIterative(1);
  console.log('\n迭代版稀疏数组:');
  console.log('  结果长度:', sparseResult2.length);
  console.log('  索引0:', sparseResult2[0]);           // 1
  console.log('  索引1存在:', 1 in sparseResult2);      // false
  console.log('  索引2:', sparseResult2[2]);             // 2
  console.log('  索引3存在:', 3 in sparseResult2);       // false
  console.log('  索引4:', sparseResult2[4]);             // 3

  console.log('\n=== Reduce 版测试 ===\n');
  console.log('[1,[2,[3,[4]]]].myFlatReduce(1)  =>', JSON.stringify([1,[2,[3,[4]]]].myFlatReduce(1)));
  console.log('[1,[2,[3,[4]]]].myFlatReduce(Infinity)  =>', JSON.stringify([1,[2,[3,[4]]]].myFlatReduce(Infinity)));
  console.log('[[[], [[]]]].myFlatReduce(Infinity)  =>', JSON.stringify([[[], [[]]]].myFlatReduce(Infinity)));
  console.log('[1,[2]].myFlatReduce(NaN)  =>', JSON.stringify([1,[2]].myFlatReduce(NaN)));
  // 注意：reduce 版使用 push(...spread)，不保留稀疏数组空槽（会填充 undefined）
  // 这是 reduce 方案的已知限制，面试中可作为讨论点

  // 深度对比
  console.log('\n=== 深度对比 ===');
  const nested = [1, [2, [3, [4, [5]]]]];
  for (let d = 0; d <= 5; d++) {
    console.log(`  depth=${d}:`, JSON.stringify(nested.myFlat(d)));
  }
}

runTests();
