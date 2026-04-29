function serial(tasks) {
  if (!Array.isArray(tasks)) {
    return Promise.reject(new TypeError('serial: tasks must be an array'));
  }

  return tasks.reduce(
    (chain, task) => {
      return chain.then((results) => {
        return task().then((result) => [...results, result]);
      });
    },
    Promise.resolve([])
  );
}

function serialOptimized(tasks) {
  const results = [];

  return tasks
    .reduce((chain, task) => {
      return chain.then(() => {
        return task().then((result) => {
          results.push(result);
        });
      });
    }, Promise.resolve())
    .then(() => results);
}

module.exports = { serial, serialOptimized };
