function debounce(fn, delay, options = {}) {
  const { leading = false, trailing = true } = options;
  let timer = null;
  let lastArgs = null;
  let lastThis = null;

  const debounced = function (...args) {
    lastArgs = args;
    lastThis = this;

    // 首次调用 + leading 模式：立即执行
    if (!timer && leading) {
      fn.apply(lastThis, lastArgs);
      lastArgs = null;
      lastThis = null;
      // 仍设置定时器，防止 delay 内再次触发
      timer = setTimeout(() => { timer = null; }, delay);
      return;
    }

    // 重置定时器（trailing 模式下 delay 结束后执行）
    if (timer) clearTimeout(timer);
    if (trailing) {
      timer = setTimeout(() => {
        timer = null;
        if (lastArgs) {
          fn.apply(lastThis, lastArgs);
          lastArgs = null;
          lastThis = null;
        }
      }, delay);
    } else {
      timer = setTimeout(() => { timer = null; }, delay);
    }
  };

  debounced.cancel = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    lastArgs = null;
    lastThis = null;
  };

  return debounced;
}

function throttle(fn, interval, options = {}) {
  const { leading = true, trailing = true } = options;
  let timer = null;
  let previous = 0;

  const throttled = function (...args) {
    const now = Date.now();

    // 首次调用 + 非 leading 模式：记录时间但不执行
    if (!previous && !leading) previous = now;

    const remaining = interval - (now - previous);

    if (remaining <= 0) {
      // 已过冷却期，立即执行
      if (timer) { clearTimeout(timer); timer = null; }
      previous = now;
      fn.apply(this, args);
    } else if (!timer && trailing) {
      // 冷却期内，设置 trailing 定时器
      timer = setTimeout(() => {
        previous = leading ? Date.now() : 0;
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };

  throttled.cancel = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    previous = 0;
  };

  return throttled;
}

module.exports = { debounce, throttle };
