const listToTree = require('./solution.js');

// 基本用法
const list1 = [
  { id: 1, parentId: null, name: '根节点' },
  { id: 2, parentId: 1, name: '子节点1' },
  { id: 3, parentId: 1, name: '子节点2' },
  { id: 4, parentId: 2, name: '孙节点1' },
];
const tree1 = listToTree(list1);
console.assert(tree1.length === 1, '基本用法：1 个根节点');
console.assert(tree1[0].children.length === 2, '基本用法：根节点有 2 个子节点');
console.assert(tree1[0].children[0].children.length === 1, '基本用法：子节点1 有 1 个孙节点');
console.assert(tree1[0].children[0].children[0].name === '孙节点1', '基本用法：孙节点名称正确');

// 多个根节点
const list2 = [
  { id: 1, parentId: null, name: '菜单A' },
  { id: 2, parentId: null, name: '菜单B' },
  { id: 3, parentId: 1, name: '菜单A-1' },
];
const tree2 = listToTree(list2);
console.assert(tree2.length === 2, '多个根节点：2 个根');
console.assert(tree2[0].children.length === 1, '多个根节点：第一个根有 1 个子节点');
console.assert(tree2[1].children.length === 0, '多个根节点：第二个根无子节点');

// 乱序输入（子节点在父节点之前出现）
const list3 = [
  { id: 3, parentId: 1, name: '子节点' },
  { id: 1, parentId: null, name: '根节点' },
];
const tree3 = listToTree(list3);
console.assert(tree3.length === 1, '乱序：1 个根节点');
console.assert(tree3[0].children.length === 1, '乱序：根节点有 1 个子节点');
console.assert(tree3[0].children[0].id === 3, '乱序：子节点 id 正确');

// 空数组
console.assert(listToTree([]).length === 0, '空数组返回空数组');

// 非数组输入
console.assert(listToTree(null).length === 0, 'null 输入返回空数组');
console.assert(listToTree(undefined).length === 0, 'undefined 输入返回空数组');

// parentId 为 undefined（视为根节点）
const list5 = [
  { id: 1, name: '无parentId字段' },
  { id: 2, parentId: 1, name: '子节点' },
];
const tree5 = listToTree(list5);
console.assert(tree5.length === 1, 'undefined parentId 视为根节点');
console.assert(tree5[0].children.length === 1, '根节点有 1 个子节点');

// 孤立节点（parentId 指向不存在的 id）
const list6 = [
  { id: 1, parentId: null, name: '根节点' },
  { id: 2, parentId: 999, name: '孤立节点' },
];
const tree6 = listToTree(list6);
console.assert(tree6.length === 1, '孤立节点：只有 1 个根节点');
console.assert(tree6[0].children.length === 0, '孤立节点：根节点无子节点（孤立节点被丢弃）');

// 循环引用（parentId 互相指向）
const list7 = [
  { id: 1, parentId: 2, name: '节点1' },
  { id: 2, parentId: 1, name: '节点2' },
];
const tree7 = listToTree(list7);
console.assert(tree7.length === 0, '循环引用：所有节点都成孤立节点，返回空数组');

// 缺少 id 的节点被跳过
const list8 = [
  { id: 1, parentId: null, name: '根节点' },
  { parentId: 1, name: '无id节点' },
];
const tree8 = listToTree(list8);
console.assert(tree8.length === 1, '缺少id：1 个根节点');
console.assert(tree8[0].children.length === 0, '缺少id：无id节点被跳过');

// 不修改原始数据
const list9 = [
  { id: 1, parentId: null, name: '根' },
  { id: 2, parentId: 1, name: '子' },
];
const orig = { ...list9[0] };
listToTree(list9);
console.assert(list9[0].children === undefined, '不修改原始数据');

console.log('✅ 全部通过');
