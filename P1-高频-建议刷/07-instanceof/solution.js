function myInstanceof(left, right) {
  if (typeof right !== 'function') {
    throw new TypeError('Right-hand side of instanceof is not callable');
  }

  if (right[Symbol.hasInstance] !== Function.prototype[Symbol.hasInstance]) {
    return right[Symbol.hasInstance](left);
  }

  if (left === null || left === undefined) return false;
  if (typeof left !== 'object' && typeof left !== 'function') return false;

  let proto = Object.getPrototypeOf(left);
  const prototype = right.prototype;

  while (proto !== null) {
    if (proto === prototype) {
      return true;
    }
    proto = Object.getPrototypeOf(proto);
  }

  return false;
}

module.exports = { myInstanceof };
