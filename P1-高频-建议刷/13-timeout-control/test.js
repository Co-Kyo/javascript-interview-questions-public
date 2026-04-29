/**
 * 超时控制器 — 测试
 * 运行：node test.js
 */

const { withTimeout } = require('./solution.js');

function delay(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function delayReject(ms, err) {
  return new Promise((_, reject) => setTimeout(() => reject(err), ms));
}

async function runTests() {
  // 基本功能：原 Promise 在超时前完成
  const r1 = await withTimeout(delay(50, 'ok'), 500);
  console.assert(r1 === 'ok', '原 Promise 在超时前完成，返回结果');

  // 超时场景：原 Promise 超过 ms 后 reject
  let timeoutCaught = false;
  try {
    await withTimeout(delay(500, 'slow'), 50);
  } catch (err) {
    timeoutCaught = err.message.includes('Timeout');
  }
  console.assert(timeoutCaught, '超时后 reject TimeoutError');

  // 原 Promise reject（未超时）：错误应正常传播
  let rejectCaught = false;
  try {
    await withTimeout(delayReject(50, new Error('biz error')), 500);
  } catch (err) {
    rejectCaught = err.message === 'biz error';
  }
  console.assert(rejectCaught, '原 Promise reject 时错误正常传播');

  // 边界：ms 为 0 应直接 reject
  let zeroCaught = false;
  try {
    await withTimeout(Promise.resolve('never'), 0);
  } catch (err) {
    zeroCaught = true;
  }
  console.assert(zeroCaught, 'ms 为 0 时直接 reject');

  // 边界：ms 为负数应直接 reject
  let negCaught = false;
  try {
    await withTimeout(Promise.resolve('never'), -100);
  } catch (err) {
    negCaught = true;
  }
  console.assert(negCaught, 'ms 为负数时直接 reject');

  // 边界：ms 非数字应直接 reject
  let nanCaught = false;
  try {
    await withTimeout(Promise.resolve('never'), 'abc');
  } catch (err) {
    nanCaught = true;
  }
  console.assert(nanCaught, 'ms 非数字时直接 reject');

  // 竞态：刚好在超时边界完成
  const r2 = await withTimeout(delay(10, 'fast'), 100);
  console.assert(r2 === 'fast', '快速完成的 Promise 正常返回');

  // 立即 resolve 的 Promise
  const r3 = await withTimeout(Promise.resolve('immediate'), 1000);
  console.assert(r3 === 'immediate', '立即 resolve 的 Promise 正常返回');

  console.log('✅ 全部通过');
}

runTests();
