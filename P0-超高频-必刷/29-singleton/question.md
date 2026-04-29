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
- **全局状态 Store**：Redux / Vuex 的 Store 本身就是单例

单例模式的核心思想：**无论 `new` 多少次，始终返回同一个实例。**

---

## 题目

实现一个 `singleton(Class)` 高阶函数，它接收一个类，返回一个"单例化"的新类。使用这个新类创建实例时，**第一次 `new` 会真正创建实例，后续所有 `new` 都返回同一个对象**。

### 示例

```js
const SingletonDB = singleton(Database);

const db1 = new SingletonDB('primary');
const db2 = new SingletonDB('replica');

console.log(db1 === db2);       // true — 同一个实例
console.log(db1.name);          // "primary"（第一次 new 的参数）
console.log(db1 instanceof Database); // true
```

---

## 约束与要求

1. **使用 Proxy 或闭包实现**，不修改原类的代码
2. **懒加载**：第一次 `new` 时才真正创建实例，而非 `singleton()` 调用时
3. **参数透传**：第一次 `new` 时传入的参数要正确传递给原类的 `constructor`
4. **类型友好**：`new SingletonDB() instanceof Database` 应为 `true`
5. 多次 `new` 传入不同参数时，只有第一次的参数生效

---

## 进阶思考（加分题）

1. 支持 `singleton.destroy()` 来手动销毁实例、允许重新创建
2. 支持"每个不同参数组一个单例"（如 primary 和 replica 各自是单例）
3. TypeScript 类型声明
