function retryFetch(fn, { retries = 3, delay = 1000, backoff = 2, onRetry } = {}) {
  if (typeof fn !== 'function') {
    throw new TypeError('fn must be a function');
  }
  if (delay <= 0 || backoff <= 0) {
    throw new RangeError('delay and backoff must be positive numbers');
  }

  function attempt(currentAttempt) {
    return fn().catch((error) => {
      if (currentAttempt < retries) {
        if (typeof onRetry === 'function') {
          onRetry(error, currentAttempt + 1);
        }

        const waitTime = delay * Math.pow(backoff, currentAttempt);

        return new Promise((resolve) => {
          setTimeout(resolve, waitTime);
        }).then(() => attempt(currentAttempt + 1));
      }

      throw error;
    });
  }

  return attempt(0);
}

function retryFetchWithJitter(fn, { retries = 3, delay = 1000, backoff = 2, onRetry } = {}) {
  function attempt(currentAttempt) {
    return fn().catch((error) => {
      if (currentAttempt < retries) {
        if (typeof onRetry === 'function') {
          onRetry(error, currentAttempt + 1);
        }

        const baseWait = delay * Math.pow(backoff, currentAttempt);
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

function retryFetchCancellable(fn, { retries = 3, delay = 1000, backoff = 2, onRetry } = {}) {
  let aborted = false;
  let timerId = null;
  let rejectFn = null;

  const promise = new Promise((resolve, reject) => {
    rejectFn = reject;

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

  promise.abort = () => {
    aborted = true;
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    if (rejectFn) {
      rejectFn(new DOMException('Aborted', 'AbortError'));
    }
  };

  return promise;
}

module.exports = { retryFetch, retryFetchWithJitter, retryFetchCancellable };
