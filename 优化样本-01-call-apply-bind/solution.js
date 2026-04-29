/**
 * 手写 call / apply / bind
 */

// ==================== myCall ====================

Function.prototype.myCall = function (thisArg, ...args) {
  thisArg = thisArg == null ? globalThis : Object(thisArg);

  const fnKey = Symbol('fn');
  thisArg[fnKey] = this;
  const result = thisArg[fnKey](...args);
  delete thisArg[fnKey];

  return result;
};

// ==================== myApply ====================

Function.prototype.myApply = function (thisArg, argsArray) {
  thisArg = thisArg == null ? globalThis : Object(thisArg);

  if (argsArray != null && !Array.isArray(argsArray)) {
    throw new TypeError('myApply: second argument must be an array or null/undefined');
  }

  const fnKey = Symbol('fn');
  thisArg[fnKey] = this;
  const result = argsArray ? thisArg[fnKey](...argsArray) : thisArg[fnKey]();
  delete thisArg[fnKey];

  return result;
};

// ==================== myBind ====================

Function.prototype.myBind = function (thisArg, ...presetArgs) {
  const originalFn = this;

  const bound = function (...laterArgs) {
    const context = this instanceof bound ? this : thisArg;

    const fnKey = Symbol('fn');
    context[fnKey] = originalFn;
    const result = context[fnKey](...presetArgs, ...laterArgs);
    delete context[fnKey];
    return result;
  };

  if (originalFn.prototype) {
    bound.prototype = Object.create(originalFn.prototype);
  }

  Object.defineProperty(bound, 'name', {
    value: `bound ${originalFn.name || ''}`.trim(),
    configurable: true,
  });

  return bound;
};
