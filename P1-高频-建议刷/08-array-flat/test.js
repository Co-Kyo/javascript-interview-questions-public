require('./solution.js');

// 基本功能：展开一层
const r1 = [1, [2, [3, [4]]]].myFlat(1);
console.assert(JSON.stringify(r1) === '[1,2,[3,[4]]]', 'depth=1 展开一层');

// 完全展开
const r2 = [1, [2, [3, [4]]]].myFlat(Infinity);
console.assert(JSON.stringify(r2) === '[1,2,3,4]', 'Infinity 完全展开');

// 展开两层
const r3 = [1, [2, [3, [4]]]].myFlat(2);
console.assert(JSON.stringify(r3) === '[1,2,3,[4]]', 'depth=2 展开两层');

// 不展开
const r4 = [1, [2, [3]]].myFlat(0);
console.assert(JSON.stringify(r4) === '[1,[2,[3]]]', 'depth=0 浅拷贝');

// 空数组
const r5 = [].myFlat(Infinity);
console.assert(JSON.stringify(r5) === '[]', '空数组');

// 无嵌套
const r6 = [1, 2, 3].myFlat(1);
console.assert(JSON.stringify(r6) === '[1,2,3]', '无嵌套');

// 深度嵌套的空数组
const r7 = [[[], [[]]]].myFlat(Infinity);
console.assert(JSON.stringify(r7) === '[]', '深度嵌套空数组');

// 稀疏数组保留空槽
const sparse = [1, , [2, , 3]];
const sr = sparse.myFlat(1);
console.assert(sr.length === 5, '稀疏数组长度为5');
console.assert(sr[0] === 1, '稀疏数组索引0');
console.assert(!(1 in sr), '稀疏数组索引1为空槽');
console.assert(sr[2] === 2, '稀疏数组索引2');
console.assert(!(3 in sr), '稀疏数组索引3为空槽');
console.assert(sr[4] === 3, '稀疏数组索引4');

// depth 为 NaN
const r8 = [1, [2]].myFlat(NaN);
console.assert(JSON.stringify(r8) === '[1,[2]]', 'NaN 按 0 处理');

// depth 为负数
const r9 = [1, [2]].myFlat(-1);
console.assert(JSON.stringify(r9) === '[1,[2]]', '负数按 0 处理');

// 不修改原数组
const original = [1, [2, [3]]];
original.myFlat(Infinity);
console.assert(JSON.stringify(original) === '[1,[2,[3]]]', '不修改原数组');

console.log('✅ 08-array-flat 全部通过');
