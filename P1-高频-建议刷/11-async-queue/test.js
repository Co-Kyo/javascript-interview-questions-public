const { AsyncQueue } = require('./solution.js');

const delay = (ms, value) => new Promise(r => setTimeout(() => r(value), ms));

(async () => {
  const q1 = new AsyncQueue();
  const r1 = await q1.add(() => delay(50, 'A'));
  const r2 = await q1.add(() => delay(30, 'B'));
  const r3 = await q1.add(() => delay(10, 'C'));
  console.assert(r1 === 'A', 'serial task 1');
  console.assert(r2 === 'B', 'serial task 2');
  console.assert(r3 === 'C', 'serial task 3');

  const q2 = new AsyncQueue({ concurrency: 2 });
  const results2 = await Promise.all([
    q2.add(() => delay(50, 'fast')),
    q2.add(() => delay(150, 'slow')),
    q2.add(() => delay(80, 'mid')),
  ]);
  console.assert(results2[0] === 'fast', 'concurrent task 1');
  console.assert(results2[1] === 'slow', 'concurrent task 2');
  console.assert(results2[2] === 'mid', 'concurrent task 3');

  const q3 = new AsyncQueue();
  const order = [];
  await q3.add(() => delay(50, 'A').then(v => { order.push(v); return v; }));
  q3.pause();
  q3.add(() => delay(10, 'B').then(v => { order.push(v); return v; }));
  q3.add(() => delay(10, 'C').then(v => { order.push(v); return v; }));
  await delay(80);
  console.assert(order.length === 1, 'pause: only 1 task completed');
  console.assert(order[0] === 'A', 'pause: first task is A');
  q3.resume();
  await delay(50);
  console.assert(order.length === 3, 'resume: all 3 tasks completed');

  const q4 = new AsyncQueue();
  const pOk = q4.add(() => Promise.resolve('ok'));
  const pFail = q4.add(() => Promise.reject(new Error('fail')));
  console.assert(await pOk === 'ok', 'success task resolves');
  try {
    await pFail;
    console.assert(false, 'should throw');
  } catch (e) {
    console.assert(e.message === 'fail', 'failed task rejects');
  }

  const q5 = new AsyncQueue();
  const p5a = q5.add(() => delay(5000, 'slow'));
  const p5b = q5.add(() => Promise.resolve('queued'));
  p5a.catch(() => {});
  p5b.catch(() => {});
  q5.clear();
  console.assert(q5._queue.length === 0, 'clear empties queue');

  try {
    new AsyncQueue({ concurrency: 0 });
    console.assert(false, 'should throw');
  } catch (e) {
    console.assert(e instanceof TypeError, 'invalid concurrency throws TypeError');
  }

  try {
    new AsyncQueue().add('not a function');
    console.assert(false, 'should throw');
  } catch (e) {
    console.assert(e instanceof TypeError, 'non-function task throws TypeError');
  }

  const q7 = new AsyncQueue();
  q7.destroy();
  try {
    await q7.add(() => Promise.resolve(1));
    console.assert(false, 'should throw');
  } catch (e) {
    console.assert(e.message === 'Queue has been destroyed', 'destroyed queue rejects add');
  }

  console.log('✅ 11-async-queue 全部通过');
})().catch(e => { console.error(e); process.exit(1); });
