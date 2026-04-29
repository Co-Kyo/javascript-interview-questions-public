function debounce(fn, delay, options = {}) {
  const { leading = false, trailing = true } = options;

  let timerId = null;
  let lastArgs = null;
  let lastThis = null;
  let lastCallTime = 0;
  let result;

  function invokeFunc() {
    const args = lastArgs;
    const thisArg = lastThis;
    lastArgs = null;
    lastThis = null;
    result = fn.apply(thisArg, args);
    return result;
  }

  function startTimer(pendingFunc, wait) {
    return setTimeout(pendingFunc, wait);
  }

  function cancel() {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    lastArgs = null;
    lastThis = null;
    lastCallTime = 0;
  }

  function leadingEdge() {
    lastCallTime = Date.now();
    if (leading) {
      return invokeFunc();
    }
    timerId = startTimer(trailingEdge, delay);
  }

  function trailingEdge() {
    timerId = null;
    if (trailing && lastArgs) {
      return invokeFunc();
    }
    lastArgs = null;
    lastThis = null;
  }

  function remainingWait() {
    const timeSinceLastCall = Date.now() - lastCallTime;
    return Math.max(0, delay - timeSinceLastCall);
  }

  function debounced(...args) {
    const now = Date.now();
    lastArgs = args;
    lastThis = this;

    const isFirstCall = (lastCallTime === 0);
    if (isFirstCall) {
      if (leading) {
        leadingEdge();
      } else {
        lastCallTime = now;
        timerId = startTimer(trailingEdge, delay);
      }
      return result;
    }

    lastCallTime = now;

    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timerId = startTimer(trailingEdge, remainingWait());

    return result;
  }

  debounced.cancel = cancel;
  return debounced;
}


function throttle(fn, interval, options = {}) {
  const { leading = true, trailing = true } = options;

  let timerId = null;
  let lastArgs = null;
  let lastThis = null;
  let previous = 0;
  let result;

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

  function trailingEdge() {
    timerId = null;
    if (trailing && lastArgs) {
      result = invokeFunc();
    }
  }

  function throttled(...args) {
    const now = Date.now();

    if (previous === 0 && !leading) {
      previous = now;
    }

    const remaining = interval - (now - previous);
    lastArgs = args;
    lastThis = this;

    if (remaining <= 0) {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      previous = now;
      result = invokeFunc();
    } else if (timerId === null && trailing) {
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

module.exports = { debounce, throttle };
