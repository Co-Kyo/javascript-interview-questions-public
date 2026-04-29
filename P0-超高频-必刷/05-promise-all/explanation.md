# 题解：手写 Promise.all / allSettled / race

## 五步讲解

---

### 第一步：理解三个方法的核心语义

在动手写代码之前，先把三个方法的行为差异理清楚，这是最容易混淆的部分：

| 方法 | 何时 resolve | 何时 reject | 结果格式 |
|------|-------------|------------|---------|
| `all` | 全部 fulfilled | **任意一个** rejected（短路） | `[v1, v2, ...]` |
| `allSettled` | 全部 settled（不管成功失败） | **永远不会** reject | `[{status, value/reason}, ...]` |
| `race` | **第一个** settled（不管成功失败） | 第一个 settled 且 rejected | 单个值 |

**关键区别**：`all` 会短路，`allSettled` 不会，`race` 只取第一个。

---

### 第二步：处理可迭代对象与值包装

三个方法都需要处理同一个前置问题：**输入可能不是纯 Promise 数组**。

```javascript
// 用户可能传入：
Promise.myAll([1, Promise.resolve(2), { then: (resolve) => resolve(3) }]);
```

解决方案：统一用 `Promise.resolve(item)` 包装每个元素：

```javascript
const items = Array.from(iterable); // 先转数组，支持 Set、Generator 等
items.forEach((item, index) => {
  Promise.resolve(item).then(/* ... */);
});
```

`Promise.resolve()` 的行为：
- 如果已经是 Promise → 直接返回
- 如果是普通值 → 包装为已 fulfilled 的 Promise
- 如果是 thenable（有 `.then` 方法）→ 会递归解析

这一步是三个方法的公共基础。

---

### 第三步：实现 Promise.myAll — 并发计数 + 短路拒绝

`myAll` 的核心挑战：**同时满足"顺序存储"和"短路拒绝"两个需求**。

```javascript
Promise.myAll = function (iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);
    if (items.length === 0) return resolve([]); // 边界：空数组

    const results = new Array(items.length); // 固定长度，按索引填入
    let settledCount = 0;
    let hasRejected = false; // 标记是否已 reject，避免 reject 后的无效处理

    items.forEach((item, index) => {
      Promise.resolve(item).then(
        (value) => {
          if (hasRejected) return; // 已 reject，跳过后续处理
          results[index] = value;       // 按索引存储，保证顺序
          settledCount++;
          if (settledCount === items.length) {
            resolve(results);            // 全部完成才 resolve
          }
        },
        (reason) => {
          if (!hasRejected) {            // 只处理第一次 reject
            hasRejected = true;
            reject(reason);              // 有一个失败就立即 reject
          }
        }
      );
    });
  });
};
```

**四个关键设计**：

1. **固定长度数组 `results`**：用 `new Array(length)` + 按 `index` 赋值，而不是 `push`，确保结果顺序与输入一致（Promise 可能以任意顺序完成）
2. **计数器 `settledCount`**：只有成功才计数，失败直接短路，两者互不干扰
3. **`hasRejected` 标记**：reject 后跳过后续 resolve 回调中的无效处理，避免不必要的计算和对 `results` 的写入
4. **`reject` 直接调用**：Promise 只能 settle 一次，后续的 `reject` 调用会被自动忽略，不会覆盖已有的结果

---

### 第四步：实现 Promise.myAllSettled — 永不失败的聚合

`myAllSettled` 与 `myAll` 的核心区别：**失败不会短路，而是记录结果后继续等待**。

```javascript
Promise.myAllSettled = function (iterable) {
  return new Promise((resolve) => {  // 注意：这里不需要 reject 参数
    const items = Array.from(iterable);
    if (items.length === 0) return resolve([]);

    const results = new Array(items.length);
    let settledCount = 0;

    items.forEach((item, index) => {
      Promise.resolve(item).then(
        (value) => {
          results[index] = { status: 'fulfilled', value };
          settledCount++;
          if (settledCount === items.length) resolve(results);
        },
        (reason) => {
          // 关键区别：不是 reject，而是记录失败结果继续等
          results[index] = { status: 'rejected', reason };
          settledCount++;
          if (settledCount === items.length) resolve(results);
        }
      );
    });
  });
};
```

**与 `myAll` 的差异对比**：

| 对比点 | myAll | myAllSettled |
|--------|-------|-------------|
| 构造函数 | `new Promise((resolve, reject) => ...)` | `new Promise((resolve) => ...)` |
| 失败处理 | `reject(reason)` + `hasRejected` 标记跳过后续 | `resolve` 时包含 `{status: 'rejected', reason}` |
| 结果格式 | 直接存值 `results[i] = value` | 包装对象 `{status, value/reason}` |

---

### 第五步：实现 Promise.myRace — 最先完成的胜出

`myRace` 是三个方法中最简单的：**不需要计数器，不需要结果数组，第一个 settle 的直接传递**。

```javascript
Promise.myRace = function (iterable) {
  return new Promise((resolve, reject) => {
    const items = Array.from(iterable);

    // 边界：空数组 → 永远 pending（与原生行为一致）
    if (items.length === 0) return;

    // 每个 Promise 的 resolve/reject 直接传递给外层
    // Promise 只能 settle 一次，所以后续完成的会被自动忽略
    items.forEach((item) => {
      Promise.resolve(item).then(resolve, reject);
    });
  });
};
```

**为什么这么简单就够了？**

- `Promise.resolve(item).then(resolve, reject)` 这一行同时处理了 fulfilled 和 rejected
- Promise 的单次 settle 特性天然保证了"只有第一个生效"
- 空数组时 `return` 不调用 `resolve`/`reject`，Promise 永远 pending

**空数组的陷阱**：很多人会写 `return resolve([])` 或 `return reject(...)`，但原生 `Promise.race([])` 返回的是永远 pending 的 Promise，这点需要特别注意。

---

## 复杂度分析

| 方法 | 时间复杂度 | 空间复杂度 | 说明 |
|------|-----------|-----------|------|
| `myAll` | O(n) | O(n) | 遍历一次，存储 n 个结果 |
| `myAllSettled` | O(n) | O(n) | 遍历一次，存储 n 个状态对象 |
| `myRace` | O(n) | O(1) | 遍历一次，不存储结果（直接传递） |

## 常见追问

### Q1：myAll 中如果某个 Promise 的 reject 比另一个的 resolve 晚，会怎样？

不会有问题。因为 `reject` 只会生效一次，外层 Promise 已经被第一个 `reject` 结束了，后续的 `resolve`/`reject` 调用都会被忽略。这也是为什么不需要"取消"后续 Promise 的原因——它们只是被静默丢弃了。

### Q2：myAll 如何处理 thenable 对象？

```javascript
Promise.myAll([
  { then: (resolve) => setTimeout(() => resolve(42), 100) }
]).then(console.log); // [42]
```

`Promise.resolve()` 会自动识别 thenable 并递归调用其 `.then` 方法，所以不需要额外处理。

### Q3：myRace 空数组为什么是 pending 而不是 reject？

这是 ECMAScript 规范的规定。空数组意味着"没有任何竞争者"，所以没有"第一个完成的"，Promise 自然永远等待。如果你的业务需要超时兜底，可以这样用：

```javascript
Promise.myRace([
  fetch('/api/data'),
  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
]);
```
