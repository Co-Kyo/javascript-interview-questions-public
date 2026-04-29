require('./solution.js');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error('❌ FAIL:', msg);
  }
}

async function runTests() {

  // ========== myAll ==========

  // 基本成功
  {
    const result = await Promise.myAll([
      Promise.resolve(1),
      new Promise(r => setTimeout(() => r(2), 50)),
      3
    ]);
    assert(JSON.stringify(result) === '[1,2,3]', 'myAll 基本成功');
  }

  // 保持顺序（后完成的先返回）
  {
    const result = await Promise.myAll([
      new Promise(r => setTimeout(() => r('a'), 100)),
      new Promise(r => setTimeout(() => r('b'), 50)),
      new Promise(r => setTimeout(() => r('c'), 80))
    ]);
    assert(result[0] === 'a' && result[1] === 'b' && result[2] === 'c', 'myAll 保持顺序');
  }

  // 有一个 reject 就立即 reject
  {
    let caught = null;
    await Promise.myAll([
      Promise.resolve(1),
      Promise.reject('fail'),
      new Promise(r => setTimeout(() => r(3), 200))
    ]).catch(e => { caught = e; });
    assert(caught === 'fail', 'myAll 短路拒绝');
  }

  // 空数组
  {
    const result = await Promise.myAll([]);
    assert(JSON.stringify(result) === '[]', 'myAll 空数组');
  }

  // 非 Promise 值自动包装
  {
    const result = await Promise.myAll([1, 'two', true]);
    assert(result[0] === 1 && result[1] === 'two' && result[2] === true, 'myAll 非 Promise 值');
  }

  // thenable 对象
  {
    const result = await Promise.myAll([
      { then: (resolve) => resolve(42) },
      Promise.resolve('ok')
    ]);
    assert(result[0] === 42 && result[1] === 'ok', 'myAll thenable');
  }

  // ========== myAllSettled ==========

  // 混合结果
  {
    const result = await Promise.myAllSettled([
      Promise.resolve('ok'),
      Promise.reject('fail'),
      42
    ]);
    assert(result[0].status === 'fulfilled' && result[0].value === 'ok', 'allSettled fulfilled');
    assert(result[1].status === 'rejected' && result[1].reason === 'fail', 'allSettled rejected');
    assert(result[2].status === 'fulfilled' && result[2].value === 42, 'allSettled 普通值');
  }

  // 空数组
  {
    const result = await Promise.myAllSettled([]);
    assert(JSON.stringify(result) === '[]', 'allSettled 空数组');
  }

  // 全部失败也 resolve
  {
    const result = await Promise.myAllSettled([
      Promise.reject('e1'),
      Promise.reject('e2')
    ]);
    assert(result.length === 2 && result.every(r => r.status === 'rejected'), 'allSettled 全部失败也 resolve');
  }

  // ========== myRace ==========

  // 竞速
  {
    const result = await Promise.myRace([
      new Promise(r => setTimeout(() => r('slow'), 200)),
      new Promise(r => setTimeout(() => r('fast'), 50))
    ]);
    assert(result === 'fast', 'myRace 取最快的');
  }

  // reject 也可以赢
  {
    let caught = null;
    await Promise.myRace([
      new Promise(r => setTimeout(() => r('slow'), 200)),
      Promise.reject('fast-err')
    ]).catch(e => { caught = e; });
    assert(caught === 'fast-err', 'myRace reject 也可以赢');
  }

  // 空数组返回永远 pending 的 Promise
  {
    const p = Promise.myRace([]);
    let settled = false;
    p.then(() => { settled = true; }).catch(() => { settled = true; });
    await new Promise(r => setTimeout(r, 200));
    assert(!settled, 'myRace 空数组永远 pending');
  }

  // 普通值竞速
  {
    const result = await Promise.myRace([42, 'hello']);
    assert(result === 42, 'myRace 普通值竞速');
  }

  console.log(`\n✅ 通过 ${passed}/${passed + failed}`);
  if (failed > 0) process.exit(1);
}

runTests();
