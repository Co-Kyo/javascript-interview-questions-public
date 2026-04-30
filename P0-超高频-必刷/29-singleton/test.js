const { singleton, singletonWithDestroy, singletonByKey } = require('./solution.js');

// === 基础 singleton ===

class Database {
  constructor(name) {
    this.name = name;
    this.id = Math.random();
  }
}

const SingletonDB = singleton(Database);

const db1 = new SingletonDB('primary');
const db2 = new SingletonDB('replica');

console.assert(db1 === db2, 'singleton: 多次 new 返回同一实例');
console.assert(db1.name === 'primary', 'singleton: 保留第一次 new 的参数');
console.assert(db2.name === 'primary', 'singleton: 后续 new 忽略参数');
console.assert(db1.id === db2.id, 'singleton: id 相同');
console.assert(db1 instanceof Database, 'singleton: instanceof Database 为 true');

// === singletonWithDestroy ===

class Logger {
  constructor() {
    this.logs = [];
  }
}

const SingletonLogger = singletonWithDestroy(Logger);

const logger1 = new SingletonLogger();
const logger2 = new SingletonLogger();
console.assert(logger1 === logger2, 'singletonWithDestroy: 销毁前返回同一实例');

SingletonLogger.destroy();

const logger3 = new SingletonLogger();
console.assert(logger1 !== logger3, 'singletonWithDestroy: 销毁后创建新实例');

// === singletonByKey ===

const SingletonDBByKey = singletonByKey(Database);

const primary1 = new SingletonDBByKey('primary');
const primary2 = new SingletonDBByKey('primary');
const replica = new SingletonDBByKey('replica');

console.assert(primary1 === primary2, 'singletonByKey: 同参数共享实例');
console.assert(primary1 !== replica, 'singletonByKey: 不同参数独立实例');
console.assert(primary1.name === 'primary', 'singletonByKey: primary 名称正确');
console.assert(replica.name === 'replica', 'singletonByKey: replica 名称正确');

console.log('✅ 全部通过');
