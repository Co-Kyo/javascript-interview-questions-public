const { Scheduler } = require('./solution.js');

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

const timeout = (time) => new Promise((resolve) => setTimeout(resolve, time));

async function runTests() {

  // 基本并发限制
  {
    const scheduler = new Scheduler(2);
    let maxConcurrent = 0;
    let currentConcurrent = 0;

    const task = (time) => () => {
      currentConcurrent++;
      maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
      return timeout(time).then(() => { currentConcurrent--; });
    };

    scheduler.add(task(200));
    scheduler.add(task(200));
    scheduler.add(task(200));
    scheduler.add(task(200));

    await timeout(1000);
    assert(maxConcurrent <= 2, '并发数不超过 max');
  }

  // 任务结果正确传递
  {
    const scheduler = new Scheduler(2);
    const result = await scheduler.add(() => Promise.resolve(42));
    assert(result === 42, '任务结果正确传递');
  }

  // 任务错误正确传递
  {
    const scheduler = new Scheduler(2);
    let caught = null;
    await scheduler.add(() => Promise.reject('err')).catch(e => { caught = e; });
    assert(caught === 'err', '任务错误正确传递');
  }

  // 错误不影响后续任务
  {
    const scheduler = new Scheduler(1);
    const results = [];

    const p1 = scheduler.add(() => Promise.resolve('ok'));
    const p2 = scheduler.add(() => Promise.reject('fail'));
    const p3 = scheduler.add(() => Promise.resolve('ok2'));

    await p1.then(v => results.push(v)).catch(() => {});
    await p2.catch(() => results.push('caught'));
    await p3.then(v => results.push(v)).catch(() => {});

    assert(results[0] === 'ok' && results[1] === 'caught' && results[2] === 'ok2', '错误不影响后续任务');
  }

  // FIFO 顺序
  {
    const scheduler = new Scheduler(1);
    const order = [];

    const p1 = scheduler.add(() => timeout(100).then(() => order.push(1)));
    const p2 = scheduler.add(() => timeout(50).then(() => order.push(2)));
    const p3 = scheduler.add(() => timeout(50).then(() => order.push(3)));

    await Promise.all([p1, p2, p3]);
    assert(JSON.stringify(order) === '[1,2,3]', 'FIFO 顺序');
  }

  // max=1 串行执行
  {
    const scheduler = new Scheduler(1);
    const order = [];

    const p1 = scheduler.add(() => timeout(100).then(() => order.push('a')));
    const p2 = scheduler.add(() => timeout(50).then(() => order.push('b')));

    await Promise.all([p1, p2]);
    assert(order[0] === 'a' && order[1] === 'b', 'max=1 串行执行');
  }

  // max 大于任务数
  {
    const scheduler = new Scheduler(10);
    let completed = 0;

    const tasks = Array.from({ length: 5 }, () =>
      scheduler.add(() => Promise.resolve().then(() => completed++))
    );

    await Promise.all(tasks);
    assert(completed === 5, 'max 大于任务数，全部并行');
  }

  // 参数校验 - max 非法
  {
    let threw = false;
    try { new Scheduler(0); } catch (e) { threw = e instanceof RangeError; }
    assert(threw, 'max=0 抛 RangeError');
  }

  {
    let threw = false;
    try { new Scheduler(-1); } catch (e) { threw = e instanceof RangeError; }
    assert(threw, 'max=-1 抛 RangeError');
  }

  // 参数校验 - task 非函数
  {
    const scheduler = new Scheduler(2);
    let caught = null;
    await scheduler.add('not a function').catch(e => { caught = e; });
    assert(caught instanceof TypeError, 'task 非函数返回 rejected Promise');
  }

  console.log(`\n✅ 通过 ${passed}/${passed + failed}`);
  if (failed > 0) process.exit(1);
}

runTests();
