Promise.myAll = function (iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);

    if (items.length === 0) {
      return resolve([]);
    }

    const results = new Array(items.length);
    let settledCount = 0;
    let hasRejected = false;

    items.forEach((item, index) => {
      Promise.resolve(item).then(
        (value) => {
          if (hasRejected) return;
          results[index] = value;
          settledCount++;
          if (settledCount === items.length) {
            resolve(results);
          }
        },
        (reason) => {
          if (!hasRejected) {
            hasRejected = true;
            reject(reason);
          }
        }
      );
    });
  });
};

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
          results[index] = { status: 'fulfilled', value };
          settledCount++;
          if (settledCount === items.length) {
            resolve(results);
          }
        },
        (reason) => {
          results[index] = { status: 'rejected', reason };
          settledCount++;
          if (settledCount === items.length) {
            resolve(results);
          }
        }
      );
    });
  });
};

Promise.myRace = function (iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);

    if (items.length === 0) {
      return;
    }

    items.forEach((item) => {
      Promise.resolve(item).then(resolve, reject);
    });
  });
};
