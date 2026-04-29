/**
 * 超时控制器 - 面试题参考答案
 *
 * 核心思路：
 * 1. withTimeout 利用 Promise.race 让原始 Promise 和超时 Promise 竞争
 * 2. fetchWithTimeout 独立实现，引入 AbortController 真正取消 HTTP 请求（未复用 withTimeout，因 fetch 需要独立的取消机制）
 */

// ============================================================
// 1. withTimeout - 通用 Promise 超时包装器
// ============================================================

/**
 * 为任意 Promise 添加超时控制
 * @param {Promise} promise - 需要包装的原始 Promise
 * @param {number} ms - 超时时间（毫秒）
 * @returns {Promise} - 竞争后的新 Promise，超时则 reject
 */
function withTimeout(promise, ms) {
  // 参数校验：ms 必须为正数
  if (typeof ms !== 'number' || ms <= 0) {
    return Promise.reject(new Error('Timeout ms must be a positive number'));
  }

  // 创建一个超时 Promise，在 ms 毫秒后 reject
  const timeoutPromise = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout: 超过 ${ms}ms`));
    }, ms);

    // 关键：无论原 Promise 成功还是失败，都要清除定时器
    // 避免内存泄漏和无意义的 reject
    promise.finally(() => clearTimeout(timer));
  });

  // Promise.race：谁先完成（resolve 或 reject）就采用谁的结果
  return Promise.race([promise, timeoutPromise]);
}

// ============================================================
// 2. fetchWithTimeout - 带超时和取消的 fetch 封装
// ============================================================

/**
 * 带超时控制的 fetch 请求
 * 超时后会通过 AbortController 真正取消底层 HTTP 请求
 *
 * @param {string} url - 请求地址
 * @param {RequestInit} options - fetch 选项（不含 signal）
 * @param {number} timeout - 超时时间（毫秒），默认 5000ms
 * @returns {Promise<Response>}
 */
function fetchWithTimeout(url, options = {}, timeout = 5000) {
  // 创建 AbortController 实例，用于取消 HTTP 请求
  const controller = new AbortController();

  // 将 controller 的 signal 注入 fetch options
  // 当 controller.abort() 被调用时，底层 TCP 连接会被关闭
  const fetchOptions = {
    ...options,
    signal: controller.signal,
  };

  // 发起 fetch 请求
  const fetchPromise = fetch(url, fetchOptions);

  // 超时 Promise：超时后主动 abort
  const timeoutPromise = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      // 超时后调用 abort()，这会：
      // 1. 中断底层 HTTP 请求（节省带宽）
      // 2. 使 fetch Promise reject 一个 AbortError（但被 Promise.race 忽略）
      controller.abort();
      const err = new Error(`Timeout: 请求 ${url} 超过 ${timeout}ms`);
      err.name = 'TimeoutError'; // 明确错误类型，便于 catch 中区分
      reject(err);
    }, timeout);

    // 请求完成后（无论成功或失败）清除定时器
    fetchPromise.finally(() => clearTimeout(timer));
  });

  // 竞争：fetch 结果 vs 超时
  return Promise.race([fetchPromise, timeoutPromise]);
}

// ============================================================
// 3. 进阶：带手动取消和重试的超时控制器
// ============================================================

/**
 * 可管理的超时 fetch 控制器
 * 支持手动取消 + 超时自动取消
 */
class FetchTimeoutController {
  constructor(defaultTimeout = 5000) {
    this.defaultTimeout = defaultTimeout;
    this._controller = null; // 当前活跃的 AbortController
    this._pendingRequests = []; // 追踪所有活跃请求，防止覆盖
  }

  /**
   * 发起带超时的请求，支持外部手动取消
   */
  request(url, options = {}, timeout) {
    // 每次请求创建新的 controller（AbortController 是一次性的）
    const controller = new AbortController();
    this._controller = controller; // 保留最新引用
    this._pendingRequests.push(controller); // 追踪所有请求
    const ms = timeout || this.defaultTimeout;

    const fetchPromise = fetch(url, {
      ...options,
      signal: controller.signal,
    }).finally(() => {
      // 请求完成后从追踪列表移除
      const idx = this._pendingRequests.indexOf(controller);
      if (idx !== -1) this._pendingRequests.splice(idx, 1);
    });

    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        controller.abort();
        const err = new Error(`Timeout: 请求超过 ${ms}ms`);
        err.name = 'TimeoutError';
        reject(err);
      }, ms);
      fetchPromise.finally(() => clearTimeout(timer));
    });

    return Promise.race([fetchPromise, timeoutPromise]);
  }

  /**
   * 手动取消当前最新请求（注意：仅取消最后一次 request() 发起的请求，
   * 若需取消所有活跃请求，请使用 cancelAll()）
   */
  cancel() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
  }

  /**
   * 取消所有活跃请求
   */
  cancelAll() {
    this._pendingRequests.forEach(c => c.abort());
    this._pendingRequests = [];
    this._controller = null;
  }
}

// ============================================================
// 使用示例
// ============================================================

// 示例 1：基本用法
withTimeout(fetch('/api/data'), 3000)
  .then((res) => res.json())
  .then((data) => console.log('数据:', data))
  .catch((err) => console.error('失败:', err.message));

// 示例 2：fetchWithTimeout
fetchWithTimeout('/api/user', { method: 'GET' }, 3000)
  .then((res) => res.json())
  .then((user) => console.log('用户:', user))
  .catch((err) => {
    if (err.name === 'TimeoutError') {
      console.log('请求超时');
    } else if (err.name === 'AbortError') {
      console.log('请求被手动取消');
    } else {
      console.error('其他错误:', err.message);
    }
  });

// 示例 3：手动取消
const controller = new FetchTimeoutController(5000);
controller.request('/api/large-file').catch((err) => {
  console.log('请求中断:', err.message);
});
// 2 秒后手动取消
setTimeout(() => controller.cancel(), 2000);
