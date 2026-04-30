function singleton(Class) {
  let instance = null;

  const SingletonProxy = new Proxy(Class, {
    construct(target, args) {
      if (!instance) {
        instance = Reflect.construct(target, args);
      }
      return instance;
    },
  });

  return SingletonProxy;
}

function singletonWithDestroy(Class) {
  let instance = null;

  const SingletonProxy = new Proxy(Class, {
    construct(target, args) {
      if (!instance) {
        instance = Reflect.construct(target, args);
      }
      return instance;
    },
  });

  SingletonProxy.destroy = () => {
    instance = null;
  };

  return SingletonProxy;
}

function singletonByKey(Class) {
  const instances = new Map();

  return new Proxy(Class, {
    construct(target, args) {
      const key = JSON.stringify(args);
      if (!instances.has(key)) {
        instances.set(key, Reflect.construct(target, args));
      }
      return instances.get(key);
    },
  });
}

module.exports = { singleton, singletonWithDestroy, singletonByKey };
