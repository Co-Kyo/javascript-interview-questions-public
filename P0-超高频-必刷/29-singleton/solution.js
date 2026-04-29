/**
 * 单例模式 - 使用 Proxy 实现
 *
 * 核心思路：
 * 1. 返回一个 Proxy 包装的构造函数
 * 2. 拦截 construct 操作（new 调用时触发）
 * 3. 第一次 new 时用 Reflect.construct 创建真实实例并缓存
 * 4. 后续 new 直接返回缓存的实例
 */

function singleton(Class) {
  // 输入校验：确保 Class 是可构造的
  if (typeof Class !== 'function') {
    throw new TypeError(`singleton() expects a class or constructor function, got ${typeof Class}`);
  }

  // 闭包缓存实例，初始为 null（懒加载：不提前创建）
  let instance = null;

  // 用 Proxy 拦截 new 操作
  // target = 原始类，args = new 时传入的参数
  const SingletonProxy = new Proxy(Class, {
    // construct 陷阱：拦截 new SingletonProxy(...) 调用
    construct(target, args) {
      if (!instance) {
        // 第一次调用：真正创建实例，参数透传给原类 constructor
        instance = Reflect.construct(target, args);
      }
      // 后续调用：直接返回缓存的实例（忽略新参数）
      return instance;
    },
  });

  return SingletonProxy;
}

// ============================================================
// 进阶：支持 destroy() 销毁实例
// ============================================================

function singletonWithDestroy(Class) {
  if (typeof Class !== 'function') {
    throw new TypeError(`singletonWithDestroy() expects a class or constructor function`);
  }

  let instance = null;

  const SingletonProxy = new Proxy(Class, {
    construct(target, args) {
      if (!instance) {
        instance = Reflect.construct(target, args);
      }
      return instance;
    },
  });

  // 在代理上挂载 destroy 方法，清空缓存以允许重新创建
  SingletonProxy.destroy = () => {
    instance = null;
  };

  return SingletonProxy;
}

// ============================================================
// 进阶：参数分组单例 — 不同参数各自是独立单例
// ============================================================

function singletonByKey(Class) {
  if (typeof Class !== 'function') {
    throw new TypeError(`singletonByKey() expects a class or constructor function`);
  }

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

// ============================================================
// 验证：基础 singleton
// ============================================================

class Database {
  constructor(name) {
    this.name = name;
    this.id = Math.random();
  }
  query(sql) {
    console.log(`[${this.name}] Executing: ${sql}`);
  }
}

const SingletonDB = singleton(Database);

const db1 = new SingletonDB('primary');
const db2 = new SingletonDB('replica'); // 参数被忽略，仍返回第一次的实例

console.log(db1 === db2);       // true
console.log(db1.name);          // "primary"（第一次 new 的参数）
console.log(db2.name);          // "primary"
console.log(db1 instanceof Database); // true（Proxy 不破坏原型链）

db1.query('SELECT 1');
// [primary] Executing: SELECT 1

// ============================================================
// 验证：destroy 销毁重置
// ============================================================

class Logger {
  constructor() {
    this.logs = [];
  }
  log(msg) {
    this.logs.push(msg);
  }
}

const SingletonLogger = singletonWithDestroy(Logger);

const logger1 = new SingletonLogger();
logger1.log('first');
console.log(logger1.logs); // ["first"]

// 销毁后重新创建
SingletonLogger.destroy();

const logger2 = new SingletonLogger();
logger2.log('second');
console.log(logger2.logs);     // ["second"] — 全新实例
console.log(logger1 === logger2); // false — 已经不是同一个了

// ============================================================
// 验证：参数分组单例
// ============================================================

const SingletonDBByKey = singletonByKey(Database);

const primary1 = new SingletonDBByKey('primary');
const primary2 = new SingletonDBByKey('primary');
const replica  = new SingletonDBByKey('replica');

console.log(primary1 === primary2); // true — 同参数共享实例
console.log(primary1 === replica);  // false — 不同参数独立实例
console.log(primary1.name);        // "primary"
console.log(replica.name);         // "replica"

// ============================================================
// 验证：输入校验
// ============================================================

try {
  singleton(42);
} catch (e) {
  console.log(e.message); // "singleton() expects a class or constructor function, got number"
}

try {
  singleton('not a class');
} catch (e) {
  console.log(e.message); // "singleton() expects a class or constructor function, got string"
}
