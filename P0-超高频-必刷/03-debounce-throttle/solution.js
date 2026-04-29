/**
 * 防抖 debounce & 节流 throttle 完整实现
 *
 * 支持：
 * - leading / trailing 配置
 * - cancel() 取消待执行调用
 * - this 上下文和参数正确传递
 */

// ============================================================
// 1. debounce - 防抖
// 核心思想：在 delay 时间内重复调用时，重置定时器；
//          只有"安静"了 delay 毫秒后，才真正执行。
// ============================================================

function debounce(fn, delay, options = {}) {
  const { leading = false, trailing = true } = options;

  let timerId = null;     // setTimeout 返回的 ID
  let lastArgs = null;    // 最后一次调用的参数
  let lastThis = null;    // 最后一次调用的 this
  let lastCallTime = 0;   // 上一次调用的时间戳
  let result;             // fn 的返回值

  // 核心：实际执行 fn 的函数
  function invokeFunc() {
    const args = lastArgs;
    const thisArg = lastThis;
    lastArgs = null;
    lastThis = null;
    result = fn.apply(thisArg, args);
    return result;
  }

  // 启动定时器（trailing 模式）
  function startTimer(pendingFunc, wait) {
    return setTimeout(pendingFunc, wait);
  }

  // 取消挂起的执行
  function cancel() {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    lastArgs = null;
    lastThis = null;
    lastCallTime = 0;
  }

  // 判断是否应该在 leading 时执行
  // 仅在从未调用过（lastCallTime === 0）且 leading 开启时
  function leadingEdge() {
    lastCallTime = Date.now();
    if (leading) {
      return invokeFunc();
    }
    // 非 leading 模式，启动 trailing 定时器
    timerId = startTimer(trailingEdge, delay);
  }

  // trailing 定时器到期时执行
  function trailingEdge() {
    timerId = null;
    // 只有当 trailing 开启且确实有调用时才执行
    if (trailing && lastArgs) {
      return invokeFunc();
    }
    lastArgs = null;
    lastThis = null;
  }

  // 计算剩余等待时间
  function remainingWait() {
    const timeSinceLastCall = Date.now() - lastCallTime;
    return Math.max(0, delay - timeSinceLastCall);
  }

  // 主函数：每次事件触发时调用
  function debounced(...args) {
    const now = Date.now();
    lastArgs = args;
    lastThis = this;

    // 首次调用或定时器已过期
    const isFirstCall = (lastCallTime === 0);
    if (isFirstCall) {
      // 首次调用：走 leading edge 逻辑
      if (leading) {
        leadingEdge(); // 立即执行（leading）或启动 trailing 定时器
      } else {
        // 非 leading，启动 trailing 定时器
        lastCallTime = now;
        timerId = startTimer(trailingEdge, delay);
      }
      return result;
    }

    // 非首次调用：更新 lastCallTime，重置 trailing 定时器
    lastCallTime = now;

    // 清除旧定时器，重设新的
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timerId = startTimer(trailingEdge, remainingWait());

    return result;
  }

  debounced.cancel = cancel;
  return debounced;
}


// ============================================================
// 2. throttle - 节流
// 核心思想：在 interval 时间窗口内，最多执行一次。
//          利用时间戳差值判断是否该执行。
// ============================================================

function throttle(fn, interval, options = {}) {
  const { leading = true, trailing = true } = options;

  let timerId = null;      // setTimeout ID
  let lastArgs = null;     // 最后一次调用的参数
  let lastThis = null;     // 最后一次调用的 this
  let previous = 0;        // 上一次执行 fn 的时间戳
  let result;              // fn 的返回值

  function invokeFunc() {
    const args = lastArgs;
    const thisArg = lastThis;
    lastArgs = null;
    lastThis = null;
    result = fn.apply(thisArg, args);
    return result;
  }

  function cancel() {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    lastArgs = null;
    lastThis = null;
    previous = 0;
  }

  // trailing 定时器到期时执行
  function trailingEdge() {
    timerId = null;
    // 仅当 trailing 开启且有挂起的调用时执行
    if (trailing && lastArgs) {
      result = invokeFunc();
    }
  }

  function throttled(...args) {
    const now = Date.now();

    // 首次调用时，如果 leading=false，跳过立即执行
    if (previous === 0 && !leading) {
      previous = now;
    }

    // 计算距离下次可执行的剩余时间
    const remaining = interval - (now - previous);
    lastArgs = args;
    lastThis = this;

    if (remaining <= 0) {
      // 到达或超过 interval，可以执行
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      previous = now;
      result = invokeFunc();
    } else if (timerId === null && trailing) {
      // 未到时间，且没有挂起的 trailing 定时器，启动一个
      // timerId = setTimeout(trailingEdge, remaining);
      timerId = setTimeout(function () {
        previous = leading ? Date.now() : 0;
        trailingEdge();
      }, remaining);
    }

    return result;
  }

  throttled.cancel = cancel;
  return throttled;
}


// ============================================================
// 测试用例 — 仅在直接执行时运行（node solution.js）
// 作为模块 require 时不执行，避免输出干扰
// ============================================================

if (require.main === module) {
  // --- debounce 测试 ---
  console.log('=== debounce 基础测试 ===');

  let callCount = 0;
  const debouncedFn = debounce((msg) => {
    callCount++;
    console.log(`debounce 执行: ${msg}`);
  }, 200);

  debouncedFn('a');
  debouncedFn('b');
  debouncedFn('c');
  // 只会执行一次，输出 'c'

  setTimeout(() => {
    console.log(`debounce 调用次数: ${callCount}`); // 期望: 1
  }, 400);

  // --- debounce cancel 测试 ---
  console.log('\n=== debounce cancel 测试 ===');

  let cancelCount = 0;
  const debouncedCancel = debounce(() => {
    cancelCount++;
    console.log('这不应该被执行');
  }, 200);

  debouncedCancel();
  debouncedCancel.cancel();

  setTimeout(() => {
    console.log(`cancel 测试执行次数: ${cancelCount}`); // 期望: 0
  }, 400);

  // --- throttle 测试 ---
  console.log('\n=== throttle 基础测试 ===');

  let throttleCount = 0;
  const throttledFn = throttle((msg) => {
    throttleCount++;
    console.log(`throttle 执行: ${msg}`);
  }, 300);

  // 快速触发多次
  throttledFn('1');
  throttledFn('2');
  throttledFn('3');

  setTimeout(() => {
    console.log(`throttle 调用次数: ${throttleCount}`); // leading=1 + trailing=1 = 2
  }, 500);

  // --- leading: false 测试 ---
  console.log('\n=== throttle leading:false 测试 ===');

  let leadingCount = 0;
  const throttledNoLeading = throttle(() => {
    leadingCount++;
    console.log(`leading:false 执行 #${leadingCount}`);
  }, 300, { leading: false, trailing: true });

  throttledNoLeading('first');

  setTimeout(() => {
    console.log(`leading:false 初始执行次数: ${leadingCount}`);
    // 期望: 首次不立即执行，300ms 后执行 trailing = 1
  }, 500);
}

// ============================================================
// 导出
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { debounce, throttle };
}
