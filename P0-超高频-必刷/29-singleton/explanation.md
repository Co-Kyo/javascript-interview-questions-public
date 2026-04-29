# 单例模式 - 五步讲解

## 第一步：理解问题本质

**单例模式要解决什么？**

某些对象在整个应用中只应该存在一个：
- 弹窗管理器：页面上只有一个 DOM 容器
- 数据库连接：重复创建浪费资源
- 日志队列：所有模块写入同一个队列

**核心约束**：无论 `new` 多少次，始终返回第一次创建的那个实例。

**朴素思路**（全局变量）：
```js
let dbInstance = null;
function getDB() {
  if (!dbInstance) dbInstance = new Database();
  return dbInstance;
}
```
问题：这不是 `new` 语法，调用方式变了，侵入性强。我们想要的是 `new SingletonDB()` 看起来和正常使用一样。

---

## 第二步：为什么选 Proxy？

JavaScript 中 `new` 操作会触发构造函数的调用。Proxy 可以拦截对象的基本操作，其中：

- `construct` 陷阱 → 拦截 `new` 操作
- `apply` 陷阱 → 拦截函数调用
- `get/set` 陷阱 → 拦截属性读写

用 `construct` 陷阱，我们可以拦截 `new SingletonProxy()`，在其中决定是否真正创建实例。

```js
const proxy = new Proxy(Class, {
  construct(target, args) {
    // target = 原始类
    // args = new 时传入的参数
    // 必须返回一个对象（新实例）
  }
});
new proxy(); // 触发 construct 陷阱
```

---

## 第三步：闭包缓存实例

Proxy 本身不存状态。要记住"是否已创建过实例"，需要**闭包**：

```js
function singleton(Class) {
  let instance = null; // 闭包变量，外部无法直接访问

  return new Proxy(Class, {
    construct(target, args) {
      if (!instance) {
        instance = Reflect.construct(target, args);
        //            ↑ 等价于 new target(...args)
        //              但更规范，能正确设置原型链
      }
      return instance;
    },
  });
}
```

**关键点**：
- `let instance = null` → 初始为 null，体现**懒加载**（不提前创建）
- `Reflect.construct(target, args)` → 比 `new target(...args)` 更好，因为它能正确处理 `new.target` 和原型链

---

## 第四步：完整工作流程

```
第 1 次 new SingletonDB('primary')
  ↓
Proxy 触发 construct 陷阱
  ↓
instance === null ?
  ↓ YES
Reflect.construct(Database, ['primary'])
  ↓
创建 Database 实例 { name: 'primary', id: 0.73 }
  ↓
赋值给 instance（闭包缓存）
  ↓
返回 instance


第 2 次 new SingletonDB('replica')
  ↓
Proxy 触发 construct 陷阱
  ↓
instance === null ?
  ↓ NO（已缓存）
直接返回 instance（忽略 'replica' 参数）
```

**验证**：
```js
const db1 = new SingletonDB('primary');
const db2 = new SingletonDB('replica');

db1 === db2              // true — 同一个对象
db1.name                 // "primary" — 只有第一次的参数生效
db1 instanceof Database  // true — 原型链正确
```

---

## 第五步：进阶讨论

### 1. 支持销毁重置

某些场景需要"注销"单例（如登出后清空状态）：

```js
function singletonWithDestroy(Class) {
  let instance = null;

  const proxy = new Proxy(Class, {
    construct(target, args) {
      if (!instance) {
        instance = Reflect.construct(target, args);
      }
      return instance;
    },
  });

  proxy.destroy = () => { instance = null; };
  return proxy;
}
```

### 2. 参数分组单例

有时不同参数需要各自的单例（如 primary 和 replica 是两个独立连接）：

```js
function singletonByKey(Class) {
  const instances = new Map();

  return new Proxy(Class, {
    construct(target, args) {
      const key = JSON.stringify(args); // 用参数作为 key
      if (!instances.has(key)) {
        instances.set(key, Reflect.construct(target, args));
      }
      return instances.get(key);
    },
  });
}

const DB = singletonByKey(Database);
const db1 = new DB('primary');
const db2 = new DB('primary'); // db1 === db2
const db3 = new DB('replica'); // db3 !== db1，独立单例
```

### 3. TypeScript 类型声明

```ts
function singleton<T extends new (...args: any[]) => any>(
  Class: T
): T {
  let instance: InstanceType<T> | null = null;

  return new Proxy(Class, {
    construct(target, args) {
      if (!instance) {
        instance = Reflect.construct(target, args);
      }
      return instance;
    },
  }) as T;
}

// 使用：返回类型与原类一致
const SingletonDB = singleton(Database);
const db = new SingletonDB('primary'); // 类型为 Database
db.query('SELECT 1');                  // IDE 自动补全正常
```

### 4. 常见陷阱与局限性

| 陷阱 | 说明 | 解法 |
|------|------|------|
| Proxy 不能与 `extends` 继承 | `class Sub extends SingletonDB` 会失败，因为 Proxy 不是真正的类 | 单例不应被继承，设计上合理 |
| `new.target` 差异 | 某些旧引擎对 Proxy 的 `new.target` 处理不一致 | 使用 `Reflect.construct` 可规避大部分问题 |
| 序列化/反序列化 | `JSON.stringify(singleton)` 会序列化实例状态，反序列化不会恢复单例 | 单例是运行时概念，不应持久化 |
| 测试困难 | 全局共享状态导致测试间互相影响 | 使用 `destroy()` 重置，或在测试中避免单例 |
| 内存泄漏 | 单例实例永远不会被 GC（除非手动 destroy） | 对于需要释放资源的场景实现 `destroy` 方法 |

### 5. 常见面试追问

| 问题 | 回答要点 |
|------|----------|
| 为什么用 Proxy 而不是直接修改类？ | 不侵入原类，通用性强，一次实现适用所有类 |
| 为什么用 `Reflect.construct` 而不是 `new target()`？ | 能正确传递 `new.target`，保证 `instanceof` 正常工作 |
| 懒加载 vs 饿加载的区别？ | 懒加载：第一次用才创建；饿加载：`singleton()` 调用时就创建 |
| 单例模式的缺点？ | 隐式全局状态、难以单元测试、耦合度高 |
| 什么时候不该用单例？ | 需要多实例测试、需要不同配置的同类对象时 |
