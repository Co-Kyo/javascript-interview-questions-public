function deepClone(obj, cache = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (cache.has(obj)) {
    return cache.get(obj);
  }

  if (obj instanceof Error) {
    const errCopy = new obj.constructor(obj.message);
    errCopy.stack = obj.stack;
    return errCopy;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags);
  }

  if (obj instanceof Map) {
    const mapCopy = new Map();
    cache.set(obj, mapCopy);
    obj.forEach((value, key) => {
      mapCopy.set(deepClone(key, cache), deepClone(value, cache));
    });
    return mapCopy;
  }

  if (obj instanceof Set) {
    const setCopy = new Set();
    cache.set(obj, setCopy);
    obj.forEach((value) => {
      setCopy.add(deepClone(value, cache));
    });
    return setCopy;
  }

  const clone = Array.isArray(obj) ? [] : Object.create(Object.getPrototypeOf(obj));
  cache.set(obj, clone);

  for (const key of Object.keys(obj)) {
    clone[key] = deepClone(obj[key], cache);
  }

  const symbolKeys = Object.getOwnPropertySymbols(obj);
  for (const sym of symbolKeys) {
    if (Object.propertyIsEnumerable.call(obj, sym)) {
      clone[sym] = deepClone(obj[sym], cache);
    }
  }

  return clone;
}

module.exports = { deepClone };
