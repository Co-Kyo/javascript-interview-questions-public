/**
 * Promise 串行执行器 — 测试
 * 运行：node test.js
 */

const { serial, serialOptimized } = require('./solution.js');

const delay = (ms, value) =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

async function runTests() {
  // 基本功能：串行执行，结果按顺序收集
  const task1 = () => delay(300, 'A');
  const task2 = () => delay(100, 'B');
  const task3 = () => delay(200, 'C');

  const r1 = await serial([task1, task2, task3]);
  console.assert(JSON.stringify(r1) === '["A","B","C"]', '基本功能：串行顺序正确');

  // serialOptimized 同样正确
  const r2 = await serialOptimized([task1, task2, task3]);
  console.assert(JSON.stringify(r2) === '["A","B","C"]', 'serialOptimized 结果一致');

  // 边界：空数组
  const r3 = await serial([]);
  console.assert(JSON.stringify(r3) === '[]', '空数组返回空数组');

  // 边界：单任务
  const r4 = await serial([() => Promise.resolve('only')]);
  console.assert(JSON.stringify(r4) === '["only"]', '单任务');

  // 边界：reject 传播
  let rejectCaught = false;
  try {
    await serial([() => Promise.resolve('ok'), () => Promise.reject(new Error('fail'))]);
  } catch (err) {
    rejectCaught = err.message === 'fail';
  }
  console.assert(rejectCaught, 'reject 传播中断链');

  // 边界：非法输入
  let invalidCaught = false;
  try {
    await serial(null);
  } catch (err) {
    invalidCaught = err instanceof TypeError;
  }
  console.assert(invalidCaught, '非法输入抛 TypeError');

  // 串行性验证：确保前一个完成后才执行下一个
  const order = [];
  const t1 = () => delay(50, 'first').then(() => { order.push(1); return 'first'; });
  const t2 = () => delay(10, 'second').then(() => { order.push(2); return 'second'; });
  const t3 = () => delay(10, 'third').then(() => { order.push(3); return 'third'; });

  await serial([t1, t2, t3]);
  console.assert(JSON.stringify(order) === '[1,2,3]', '执行顺序严格串行');

  console.log('✅ 全部通过');
}

runTests();
