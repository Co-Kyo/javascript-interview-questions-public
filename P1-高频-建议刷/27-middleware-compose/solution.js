function compose(middlewares) {
  if (!Array.isArray(middlewares)) {
    throw new TypeError('middlewares must be an array')
  }

  for (const fn of middlewares) {
    if (typeof fn !== 'function') {
      throw new TypeError('each middleware must be a function')
    }
  }

  return function (context) {
    let index = -1

    function dispatch(i) {
      if (i <= index) {
        return Promise.reject(new Error('next() called multiple times'))
      }
      index = i

      let fn = middlewares[i]
      if (i === middlewares.length) {
        fn = () => Promise.resolve()
      }

      try {
        return Promise.resolve(fn(context, () => dispatch(i + 1)))
      } catch (err) {
        return Promise.reject(err)
      }
    }

    return dispatch(0)
  }
}

module.exports = compose
