function withTimeout(promise, ms) {
  if (typeof ms !== 'number' || ms <= 0) {
    return Promise.reject(new Error('Timeout ms must be a positive number'));
  }

  const timeoutPromise = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout: 超过 ${ms}ms`));
    }, ms);

    promise.then(() => {}, () => {}).finally(() => clearTimeout(timer));
  });

  return Promise.race([promise, timeoutPromise]);
}

function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();

  const fetchOptions = {
    ...options,
    signal: controller.signal,
  };

  const fetchPromise = fetch(url, fetchOptions);

  const timeoutPromise = new Promise((_, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      const err = new Error(`Timeout: 请求 ${url} 超过 ${timeout}ms`);
      err.name = 'TimeoutError';
      reject(err);
    }, timeout);

    fetchPromise.finally(() => clearTimeout(timer));
  });

  return Promise.race([fetchPromise, timeoutPromise]);
}

class FetchTimeoutController {
  constructor(defaultTimeout = 5000) {
    this.defaultTimeout = defaultTimeout;
    this._controller = null;
    this._pendingRequests = [];
  }

  request(url, options = {}, timeout) {
    const controller = new AbortController();
    this._controller = controller;
    this._pendingRequests.push(controller);
    const ms = timeout || this.defaultTimeout;

    const fetchPromise = fetch(url, {
      ...options,
      signal: controller.signal,
    }).finally(() => {
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

  cancel() {
    if (this._controller) {
      this._controller.abort();
      this._controller = null;
    }
  }

  cancelAll() {
    this._pendingRequests.forEach(c => c.abort());
    this._pendingRequests = [];
    this._controller = null;
  }
}

module.exports = { withTimeout, fetchWithTimeout, FetchTimeoutController };
