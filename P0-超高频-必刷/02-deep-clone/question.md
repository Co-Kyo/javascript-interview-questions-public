> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 02 深拷贝（含循环引用）

> 分类：JavaScript 核心手写 | 难度：⭐⭐⭐ | 考察点：递归、WeakMap 去环、类型判断、特殊对象处理

## 背景

深拷贝是 JavaScript 中 3-5 年经验开发者必须掌握的核心手写题。在实际开发中，Redux 状态管理、数据不可变更新、表单数据快照等场景都离不开深拷贝。面试中这道题能同时考察候选人对递归、类型系统、内存管理的理解深度。

## 要求

实现 `deepClone(obj)` 函数，满足以下要求：

1. **基本类型**：`null`、`undefined`、`number`、`string`、`boolean`、`symbol`、`bigint` 直接返回
2. **普通对象 & 数组**：递归深拷贝
3. **特殊对象**：正确拷贝 `Date`、`RegExp`、`Map`、`Set`
4. **Error 对象**：正确拷贝 `Error` 及其子类（`TypeError`、`RangeError` 等），保留 `message` 和 `stack`
5. **循环引用**：对象存在自引用或互引用时不能死循环，拷贝后引用关系保持一致
6. **Symbol 属性**：可枚举的 Symbol 键属性也需拷贝
7. **函数**：直接返回引用（不拷贝函数体）

## 示例

```javascript
// 嵌套对象
const obj = { a: 1, b: { c: [3, 4] } };
const cloned = deepClone(obj);
cloned.b.c.push(5);
console.log(obj.b.c);  // [3, 4]  原对象不受影响

// 循环引用
const obj2 = { name: 'root' };
obj2.self = obj2;
const cloned2 = deepClone(obj2);
console.log(cloned2.self === cloned2);  // true
console.log(cloned2.self !== obj2);     // true

// 特殊类型
const obj3 = { date: new Date('2024-01-01'), reg: /hello/gi, map: new Map([['k', 'v']]) };
const cloned3 = deepClone(obj3);
console.log(cloned3.date instanceof Date);  // true
console.log(cloned3.date !== obj3.date);     // true

// Error 对象
const err = new Error('something went wrong');
const clonedErr = deepClone(err);
console.log(clonedErr.message);           // 'something went wrong'
console.log(clonedErr instanceof Error);  // true
```

> 💡 **现代替代**：`structuredClone(value)` 是浏览器/Node.js 17+ 原生深拷贝方案，支持循环引用和大多数内置类型，但不支持函数、DOM 节点和 Symbol 属性。

## 约束

- **禁止使用** `JSON.parse(JSON.stringify())`（无法处理循环引用、Date、RegExp、Map、Set、undefined、函数等）
- 不能使用第三方库（如 lodash 的 `_.cloneDeep`）
- 要求纯手写实现，时间 15-20 分钟内完成
