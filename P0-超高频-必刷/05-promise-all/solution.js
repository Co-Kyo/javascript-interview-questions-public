/**
 * 手写 Promise.all / Promise.allSettled / Promise.race
 *
 * 核心思路：
 * 1. 遍历可迭代对象，将每个值包装为 Promise（统一处理）
 * 2. 根据各方法的语义，控制 resolve/reject 的时机
 *
 * 时间复杂度：O(n)，n 为可迭代对象的元素数量
 * 空间复杂度：O(n)，存储结果数组
 */

// ============================================================
// Promise.myAll
// ============================================================
Promise.myAll = function (iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable); // 转为数组，支持任意可迭代对象

    // 空数组立即 resolve
    if (items.length === 0) {
      return resolve([]);
    }

    const results = new Array(items.length); // 用固定长度数组保证顺序
    let settledCount = 0; // 已完成的计数器
    let hasRejected = false; // 标记是否已 reject，避免重复处理

    items.forEach((item, index) => {
      // 用 Promise.resolve 包装：统一处理非 Promise 值和 thenable
      Promise.resolve(item).then(
        (value) => {
          if (hasRejected) return; // 已经 reject，跳过后续处理
          results[index] = value; // 按索引存储，保证顺序
          settledCount++;

          // 全部完成时 resolve
          if (settledCount === items.length) {
            resolve(results);
          }
        },
        (reason) => {
          // 关键：有一个 reject 就立即 reject，短路退出
          if (!hasRejected) {
            hasRejected = true;
            reject(reason);
          }
        }
      );
    });
  });
};

// ============================================================
// Promise.myAllSettled
// ============================================================
Promise.myAllSettled = function (iterable) {
  return new Promise((resolve) => {
    const items = Array.from(iterable);

    if (items.length === 0) {
      return resolve([]);
    }

    const results = new Array(items.length);
    let settledCount = 0;

    items.forEach((item, index) => {
      Promise.resolve(item).then(
        (value) => {
          // 成功：标记 status 为 fulfilled
          results[index] = { status: 'fulfilled', value };
          settledCount++;

          if (settledCount === items.length) {
            resolve(results);
          }
        },
        (reason) => {
          // 失败：标记 status 为 rejected，存储 reason
          // 注意：这里不会 reject 外层 Promise，而是记录结果继续等待
          results[index] = { status: 'rejected', reason };
          settledCount++;

          if (settledCount === items.length) {
            resolve(results); // 全部完成才 resolve（无论成功失败）
          }
        }
      );
    });
  });
};

// ============================================================
// Promise.myRace
// ============================================================
Promise.myRace = function (iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);

    // 空数组：返回永远 pending 的 Promise（与原生行为一致）
    if (items.length === 0) {
      return; // 不调用 resolve 或 reject，Promise 永远 pending
    }

    // 关键：每个 Promise 只要 settle（fulfilled 或 rejected）就立即传递结果
    // 后续的结果会被忽略（Promise 只能 settle 一次）
    items.forEach((item) => {
      Promise.resolve(item).then(resolve, reject);
    });
  });
};

// ============================================================
// 测试用例
// ============================================================
if (require.main === module) {
  // 自定义序列化：正确处理 Error 对象
  const serialize = (val) => {
    if (val instanceof Error) return `Error: ${val.message}`;
    if (Array.isArray(val)) {
      return '[\n' + val.map((item) => {
        if (item && typeof item === 'object' && item.reason instanceof Error) {
          return `  { status: '${item.status}', reason: Error: ${item.reason.message} }`;
        }
        if (item && typeof item === 'object' && item.status) {
          return `  { status: '${item.status}', value: ${JSON.stringify(item.value)} }`;
        }
        return '  ' + JSON.stringify(item);
      }).join(',\n') + '\n]';
    }
    return JSON.stringify(val, null, 2);
  };

  (async () => {
    console.log('--- Promise.myAll ---');

    // 成功场景
    const allResult = await Promise.myAll([
      Promise.resolve(1),
      new Promise((r) => setTimeout(() => r(2), 50)),
      Promise.resolve(3),
    ]);
    console.log('myAll 成功:', allResult); // [1, 2, 3]

    // 失败场景
    try {
      await Promise.myAll([
        Promise.resolve(1),
        Promise.reject(new Error('boom')),
        new Promise((r) => setTimeout(() => r(3), 200)),
      ]);
    } catch (e) {
      console.log('myAll 失败:', e.message); // boom
    }

    // 空数组
    console.log('myAll 空数组:', await Promise.myAll([])); // []

    // [新增] 非 Promise 值：普通值自动包装为 fulfilled Promise
    const mixedResult = await Promise.myAll([1, Promise.resolve(2), 'three']);
    console.log('myAll 混合值:', mixedResult); // [1, 2, 'three']

    // [新增] thenable 对象
    const thenableResult = await Promise.myAll([
      { then: (resolve) => resolve(42) },
      Promise.resolve('ok'),
    ]);
    console.log('myAll thenable:', thenableResult); // [42, 'ok']

    console.log('\n--- Promise.myAllSettled ---');

    const settledResult = await Promise.myAllSettled([
      Promise.resolve('ok'),
      Promise.reject(new Error('fail')),
      Promise.resolve('good'),
    ]);
    console.log('myAllSettled:', serialize(settledResult));

    console.log('\n--- Promise.myRace ---');

    const raceResult = await Promise.myRace([
      new Promise((r) => setTimeout(() => r('slow'), 200)),
      new Promise((r) => setTimeout(() => r('fast'), 50)),
    ]);
    console.log('myRace:', raceResult); // fast

    // 空数组 race —— 3 秒超时验证
    console.log('myRace 空数组: Promise 永远 pending (3 秒后自动退出)...');
    Promise.myRace([]).then(
      () => console.log('resolved'),
      () => console.log('rejected')
    );
    setTimeout(() => {
      console.log('超时退出 ✓');
      process.exit(0);
    }, 3000);
  })();
}
