function curry(fn) {
  if (fn.length === 0) return fn;

  return function curried(...args) {
    const context = this;

    if (args.length >= fn.length) {
      return fn.apply(context, args);
    }
    return function (...nextArgs) {
      return curried.apply(context, [...args, ...nextArgs]);
    };
  };
}

module.exports = { curry };
