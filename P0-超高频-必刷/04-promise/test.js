const { MyPromise } = require('./solution.js');

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

  // 基本 resolve
  {
    const val = await new MyPromise(r => r(42));
    assert(val === 42, '基本 resolve');
  }

  // 基本 reject + catch
  {
    try {
      await new MyPromise((_, rej) => rej('err'));
      assert(false, '应该 reject');
    } catch (e) {
      assert(e === 'err', '基本 reject');
    }
  }

  // 异步 resolve
  {
    const val = await new MyPromise(r => setTimeout(() => r(1), 50));
    assert(val === 1, '异步 resolve');
  }

  // 链式调用 + 值传递
  {
    const val = await MyPromise.resolve(1)
      .then(v => v + 1)
      .then(v => v + 1);
    assert(val === 3, '链式调用值传递');
  }

  // then 返回 Promise
  {
    const val = await MyPromise.resolve(1)
      .then(v => new MyPromise(r => setTimeout(() => r(v * 10), 50)));
    assert(val === 10, 'then 返回 Promise');
  }

  // 值穿透
  {
    const val = await MyPromise.resolve(42)
      .then()
      .then()
      .then(v => v);
    assert(val === 42, '值穿透');
  }

  // 错误捕获
  {
    const val = await new MyPromise((_, rej) => rej('err'))
      .catch(e => 'recovered:' + e);
    assert(val === 'recovered:err', 'catch 错误捕获');
  }

  // 错误冒泡
  {
    let caught = null;
    await MyPromise.resolve(1)
      .then(() => { throw new Error('bubble'); })
      .then(() => { assert(false, '不应执行'); })
      .catch(e => { caught = e; });
    assert(caught && caught.message === 'bubble', '错误冒泡');
  }

  // executor 同步异常
  {
    const val = await new MyPromise(() => { throw new Error('sync'); })
      .catch(e => e.message);
    assert(val === 'sync', 'executor 同步异常');
  }

  // finally 不改变值
  {
    const val = await MyPromise.resolve('original')
      .finally(() => 'ignored')
      .then(v => v);
    assert(val === 'original', 'finally 不改变值');
  }

  // finally 传递错误
  {
    let caught = null;
    await MyPromise.reject('err')
      .finally(() => {})
      .catch(e => { caught = e; });
    assert(caught === 'err', 'finally 传递错误');
  }

  // MyPromise.all 成功
  {
    const val = await MyPromise.all([
      MyPromise.resolve(1),
      new MyPromise(r => setTimeout(() => r(2), 50)),
      3
    ]);
    assert(JSON.stringify(val) === '[1,2,3]', 'Promise.all 成功');
  }

  // MyPromise.all 失败短路
  {
    let caught = null;
    await MyPromise.all([
      MyPromise.resolve(1),
      MyPromise.reject('fail'),
      new MyPromise(r => setTimeout(() => r(3), 200))
    ]).catch(e => { caught = e; });
    assert(caught === 'fail', 'Promise.all 失败短路');
  }

  // MyPromise.all 空数组
  {
    const val = await MyPromise.all([]);
    assert(JSON.stringify(val) === '[]', 'Promise.all 空数组');
  }

  // MyPromise.race
  {
    const val = await MyPromise.race([
      new MyPromise(r => setTimeout(() => r('slow'), 200)),
      new MyPromise(r => setTimeout(() => r('fast'), 50))
    ]);
    assert(val === 'fast', 'Promise.race');
  }

  // MyPromise.allSettled
  {
    const val = await MyPromise.allSettled([
      MyPromise.resolve('ok'),
      MyPromise.reject('fail'),
      42
    ]);
    assert(val[0].status === 'fulfilled' && val[0].value === 'ok', 'allSettled fulfilled');
    assert(val[1].status === 'rejected' && val[1].reason === 'fail', 'allSettled rejected');
    assert(val[2].status === 'fulfilled' && val[2].value === 42, 'allSettled 普通值');
  }

  // 循环引用检测
  {
    const p = MyPromise.resolve(1);
    const p2 = p.then(() => p2);
    let caught = null;
    await p2.catch(e => { caught = e; });
    assert(caught instanceof TypeError, '循环引用检测');
  }

  // thenable 解析
  {
    const thenable = {
      then(resolve) { setTimeout(() => resolve('thenable'), 10); }
    };
    const val = await MyPromise.resolve(thenable);
    assert(val === 'thenable', 'thenable 解析');
  }

  // MyPromise.resolve 包装
  {
    const p = MyPromise.resolve(99);
    assert(p instanceof MyPromise, 'Promise.resolve 返回 MyPromise');
    const val = await p;
    assert(val === 99, 'Promise.resolve 值正确');
  }

  // MyPromise.reject 包装
  {
    let caught = null;
    await MyPromise.reject('reason').catch(e => { caught = e; });
    assert(caught === 'reason', 'Promise.reject');
  }

  // then 异步执行（不阻塞同步代码）
  {
    const order = [];
    order.push('sync1');
    MyPromise.resolve(1).then(() => order.push('then'));
    order.push('sync2');
    await new MyPromise(r => setTimeout(r, 50));
    assert(order[0] === 'sync1' && order[1] === 'sync2' && order[2] === 'then', 'then 异步执行');
  }

  console.log(`\n✅ 通过 ${passed}/${passed + failed}`);
  if (failed > 0) process.exit(1);
}

runTests();
