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

module.exports = { retryFetch };
