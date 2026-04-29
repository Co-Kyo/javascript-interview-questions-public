> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 29 - 单例模式

## 分类
设计模式与架构

## 难度
⭐⭐

## 考察点
- 闭包的应用
- Proxy 的 `construct` 拦截
- 全局唯一实例的保证
- 懒加载（延迟初始化）

---

## 背景

在前端开发中，有些对象在全局范围内只需要一个实例：

- **全局弹窗管理器**：多个模块调用 `openModal()`，但页面上只能有一个弹窗 DOM
- **数据库连接池**：重复创建连接会耗尽资源
- **日志管理器**：所有模块写入同一个日志队列
- **全局状态 Store**：Redux / Vuex 的 Store 本身就是单例

单例模式的核心思想：**无论 `new` 多少次，始终返回同一个实例。**

---

## 题目

实现一个 `singleton(Class)` 高阶函数，它接收一个类，返回一个"单例化"的新类。使用这个新类创建实例时，**第一次 `new` 会真正创建实例，后续所有 `new` 都返回同一个对象**。

### 函数签名

```js
function singleton(Class) {
  // 返回一个"伪装成 Class"的构造函数/代理
  // 第一次 new 时创建实例并缓存
  // 后续 new 时直接返回缓存的实例
}
```

### 示例

```js
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

console.log(db1 === db2);       // true — 同一个实例
console.log(db1.name);          // "primary"（第一次 new 的参数）
console.log(db2.id === db1.id); // true

db1.query('SELECT * FROM users');
// [primary] Executing: SELECT * FROM users
```

### 另一个示例

```js
class Logger {
  constructor() {
    this.logs = [];
  }
  log(msg) {
    this.logs.push(msg);
  }
}

const SingletonLogger = singleton(Logger);

const logger1 = new SingletonLogger();
logger1.log('started');

const logger2 = new SingletonLogger();
logger2.log('connected');

console.log(logger1.logs);    // ["started", "connected"] — 共享同一个实例
console.log(logger1 === logger2); // true
```

---

## 约束与要求

1. **使用 Proxy 或闭包实现**，不修改原类的代码
2. **懒加载**：第一次 `new` 时才真正创建实例，而非 `singleton()` 调用时
3. **参数透传**：第一次 `new` 时传入的参数要正确传递给原类的 `constructor`
4. **类型友好**：`new SingletonDB() instanceof Database` 应为 `true`（加分项）
5. **考虑边界情况**：
   - `singleton` 可以包装任意类，不仅限于 `Database`
   - 多次 `new` 传入不同参数时，只有第一次的参数生效

---

## 进阶思考（加分题）

1. 如果需要支持 `singleton.destroy()` 来手动销毁实例、允许重新创建，该如何实现？
2. 如果需要支持"每个不同参数组一个单例"（如 `new SingletonDB('primary')` 和 `new SingletonDB('replica')` 各自是单例），该如何设计？
3. TypeScript 下如何为 `singleton(Class)` 编写类型声明，使其返回类型与原类一致？
