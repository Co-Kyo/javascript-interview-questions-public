/**
 * Promise 串行执行器
 * 按顺序依次执行一组返回 Promise 的函数，前一个完成后再执行下一个
 *
 * @param {Function[]} tasks - 每个元素是返回 Promise 的函数
 * @returns {Promise<any[]>} - resolve 为所有任务结果的数组
 */
function serial(tasks) {
  // 输入校验：确保 tasks 是数组
  if (!Array.isArray(tasks)) {
    return Promise.reject(new TypeError('serial: tasks must be an array'));
  }

  // 核心思路：用 reduce 将 tasks 数组"折叠"成一条 Promise 链
  // 初始值是一个已 resolve 的空数组 Promise，作为链的起点
  return tasks.reduce(
    (chain, task) => {
      // chain 是"到目前为止"的 Promise 链
      // 每次迭代：等 chain 完成 → 执行当前 task → 将结果追加到数组
      return chain.then((results) => {
        return task().then((result) => [...results, result]);
      });
    },
    Promise.resolve([]) // 初始值：已 resolve 的 Promise，携带空数组
  );
}

// ─── 变体：使用可变数组避免 O(n²) 的数组拷贝 ───

/**
 * 优化版：内部维护一个可变数组，避免每次 [...results, result] 的拷贝开销
 * 性能更好，但内部状态是可变的（面试中可作为进阶讨论点）
 */
function serialOptimized(tasks) {
  const results = [];

  return tasks
    .reduce((chain, task) => {
      return chain.then(() => {
        return task().then((result) => {
          results.push(result); // 直接 push，不创建新数组
        });
      });
    }, Promise.resolve())
    .then(() => results); // 链结束后返回收集的结果
}

// ─── 测试用例 ───

// 模拟异步任务（带延迟，方便观察执行顺序）
const delay = (ms, value) =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

const task1 = () => delay(300, 'A');
const task2 = () => delay(100, 'B'); // 虽然 B 最快，但必须等 A 完成
const task3 = () => delay(200, 'C');

// 基础测试
serial([task1, task2, task3]).then((results) => {
  console.log('serial:', results); // ['A', 'B', 'C']
});

serialOptimized([task1, task2, task3]).then((results) => {
  console.log('serialOptimized:', results); // ['A', 'B', 'C']
});

// 边界测试 1：空数组
serial([]).then((results) => {
  console.log('empty:', results); // []
});

// 边界测试 2：单任务
serial([() => Promise.resolve('only')]).then((results) => {
  console.log('single:', results); // ['only']
});

// 边界测试 3：任务 reject（验证错误传播）
serial([() => Promise.resolve('ok'), () => Promise.reject(new Error('fail'))])
  .catch((err) => {
    console.log('reject caught:', err.message); // 'fail'
  });

// 边界测试 4：非法输入
serial(null).catch((err) => {
  console.log('invalid input:', err.message); // 'serial: tasks must be an array'
});

// 导出供测试使用
module.exports = { serial, serialOptimized };
