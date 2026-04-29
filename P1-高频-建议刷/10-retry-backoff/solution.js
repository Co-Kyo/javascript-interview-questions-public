/**
 * 带重试的异步请求（指数退避）
 *
 * @param {Function} fn - 返回 Promise 的异步函数
 * @param {Object} options
 * @param {number} [options.retries=3] - 最大重试次数
 * @param {number} [options.delay=1000] - 初始延迟（ms）
 * @param {number} [options.backoff=2] - 退避因子
 * @param {Function} [options.onRetry] - 重试回调 (error, attempt) => void
 * @returns {Promise<any>}
 */
function retryFetch(fn, { retries = 3, delay = 1000, backoff = 2, onRetry } = {}) {
  // 参数校验
  if (typeof fn !== 'function') {
    throw new TypeError('fn must be a function');
  }
  if (delay <= 0 || backoff <= 0) {
    throw new RangeError('delay and backoff must be positive numbers');
  }

  // 内部递归函数：attempt 从 0 开始计数（0 = 首次调用）
  function attempt(currentAttempt) {
    return fn().catch((error) => {
      // 如果还有重试次数
      if (currentAttempt < retries) {
        // 触发 onRetry 回调，attempt 从 1 开始（方便阅读）
        if (typeof onRetry === 'function') {
          onRetry(error, currentAttempt + 1);
        }

        // 计算当前等待时间：delay × backoff^currentAttempt
        // 第 1 次重试等 delay×1，第 2 次等 delay×backoff，第 3 次等 delay×backoff² ...
        const waitTime = delay * Math.pow(backoff, currentAttempt);

        // setTimeout Promise 化：将回调风格转为 Promise
        return new Promise((resolve) => {
          setTimeout(resolve, waitTime);
        }).then(() => attempt(currentAttempt + 1)); // 递归调用
      }

      // 重试次数耗尽，抛出最后一次错误
      throw error;
    });
  }

  // 从第 0 次开始（首次调用）
  return attempt(0);
}

// ==================== 使用示例 ====================

// 示例 1：第 3 次成功
let callCount = 0;
const flakyFn = () => {
  callCount++;
  if (callCount < 3) return Promise.reject(new Error(`fail #${callCount}`));
  return Promise.resolve('success!');
};

retryFetch(flakyFn, {
  retries: 3,
  delay: 1000,
  backoff: 2,
  onRetry: (err, attempt) => {
    console.log(`第 ${attempt} 次重试，原因: ${err.message}`);
  }
}).then(console.log);
// 第 1 次重试，原因: fail #1    （等待 1s）
// 第 2 次重试，原因: fail #2    （等待 2s）
// "success!"

// ==================== 进阶：带抖动版本 ====================

/**
 * 带随机抖动的指数退避（避免惊群效应）
 * jitter 策略：在 [0.5×waitTime, waitTime] 范围内取随机值，避免 0ms 等待
 */
function retryFetchWithJitter(fn, { retries = 3, delay = 1000, backoff = 2, onRetry } = {}) {
  function attempt(currentAttempt) {
    return fn().catch((error) => {
      if (currentAttempt < retries) {
        if (typeof onRetry === 'function') {
          onRetry(error, currentAttempt + 1);
        }

        const baseWait = delay * Math.pow(backoff, currentAttempt);
        // 加入随机抖动：实际等待时间在 [0.5×baseWait, baseWait] 之间
        const jitter = baseWait * (0.5 + Math.random() * 0.5);

        return new Promise((resolve) => {
          setTimeout(resolve, jitter);
        }).then(() => attempt(currentAttempt + 1));
      }

      throw error;
    });
  }

  return attempt(0);
}

// ==================== 进阶：可取消版本 ====================

/**
 * 支持 AbortController 的重试函数
 */
function retryFetchCancellable(fn, { retries = 3, delay = 1000, backoff = 2, onRetry } = {}) {
  let aborted = false;
  let timerId = null;

  const promise = new Promise((resolve, reject) => {
    function attempt(currentAttempt) {
      if (aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }

      fn().then(resolve).catch((error) => {
        if (aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }

        if (currentAttempt < retries) {
          if (typeof onRetry === 'function') {
            onRetry(error, currentAttempt + 1);
          }

          const waitTime = delay * Math.pow(backoff, currentAttempt);
          timerId = setTimeout(() => attempt(currentAttempt + 1), waitTime);
        } else {
          reject(error);
        }
      });
    }

    attempt(0);
  });

  // 返回 promise + abort 方法（同时清除待执行的定时器）
  promise.abort = () => {
    aborted = true;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  return promise;
}
