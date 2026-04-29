> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 14 - LRU 缓存

## 题目信息

| 属性 | 值 |
|------|-----|
| 分类 | 数据结构与算法 |
| 难度 | ⭐⭐⭐ |
| 考察点 | Map、双向链表、哈希表、缓存淘汰策略 |

---

## 背景

LRU（Least Recently Used，最近最少使用）是一种经典的缓存淘汰策略，广泛应用于：

- **浏览器缓存**：当内存不足时，优先淘汰最久未访问的页面资源
- **React Query / SWR 缓存**：客户端数据缓存池有容量上限，超出时按 LRU 策略清除旧数据
- **CDN 边缘节点**：存储空间有限，按访问热度淘汰冷数据
- **操作系统页面置换**：物理内存不足时，选择最久未使用的页面换出到磁盘
- **数据库缓冲池**：如 MySQL 的 Buffer Pool 使用 LRU 变体管理数据页

理解 LRU 缓存的实现，是掌握「如何用数据结构解决实际工程问题」的典型范例。

---

## 题目要求

设计并实现一个 **LRU 缓存**数据结构。实现 `LRUCache` 类：

```javascript
class LRUCache {
  /**
   * @param {number} capacity - 缓存容量
   */
  constructor(capacity) {}

  /**
   * 获取 key 对应的值
   * 如果 key 存在，返回对应 value（同时标记为最近使用）
   * 如果 key 不存在，返回 -1
   * @param {number} key
   * @return {number}
   */
  get(key) {}

  /**
   * 写入或更新键值对
   * 如果 key 已存在，更新 value 并标记为最近使用
   * 如果 key 不存在且缓存已满，先淘汰最久未使用的键值对，再插入新数据
   * @param {number} key
   * @param {number} value
   * @return {void}
   */
  put(key, value) {}
}
```

---

## 示例

### 示例 1：基本操作

```javascript
const cache = new LRUCache(2); // 容量为 2

cache.put(1, 1);    // 缓存: {1=1}
cache.put(2, 2);    // 缓存: {1=1, 2=2}
cache.get(1);       // 返回 1，缓存: {2=2, 1=1}（1 被访问，变为最近使用）
cache.put(3, 3);    // 容量已满，淘汰最久未使用的 key=2，缓存: {1=1, 3=3}
cache.get(2);       // 返回 -1（key=2 已被淘汰）
cache.put(4, 4);    // 容量已满，淘汰最久未使用的 key=1，缓存: {3=3, 4=4}
cache.get(1);       // 返回 -1（key=1 已被淘汰）
cache.get(3);       // 返回 3，缓存: {4=4, 3=3}
cache.get(4);       // 返回 4，缓存: {3=3, 4=4}
```

### 示例 2：更新已存在的 key

```javascript
const cache = new LRUCache(2);

cache.put(1, 1);    // 缓存: {1=1}
cache.put(2, 2);    // 缓存: {1=1, 2=2}
cache.put(1, 10);   // 更新 key=1 的值，缓存: {2=2, 1=10}
cache.put(3, 3);    // 淘汰 key=2，缓存: {1=10, 3=3}
cache.get(2);       // 返回 -1
cache.get(1);       // 返回 10
```

### 示例 3：边界情况

```javascript
// capacity = 1：每次 put 都会淘汰前一个
const cache = new LRUCache(1);
cache.put(1, 1);    // 缓存: {1=1}
cache.put(2, 2);    // 淘汰 key=1，缓存: {2=2}
cache.get(1);       // 返回 -1（key=1 已被淘汰）
cache.get(2);       // 返回 2

// 空缓存直接 get
const emptyCache = new LRUCache(3);
emptyCache.get(1);  // 返回 -1（缓存为空）

// 单元素更新不触发淘汰
const cache2 = new LRUCache(2);
cache2.put(1, 1);
cache2.put(1, 100); // 更新 key=1，不淘汰任何元素
cache2.get(1);      // 返回 100
```

---

## 约束条件

- `1 <= capacity <= 3000`
- `0 <= key <= 10000`
- `0 <= value <= 10^5`
- 最多调用 `2 × 10^5` 次 `get` 和 `put`
- **`get` 和 `put` 必须以 O(1) 平均时间复杂度运行**

---

## 进阶追问

1. **为什么 Map 可以直接用？** ES6 `Map` 的迭代顺序是什么？它如何保证 O(1) 的插入/删除/查找？
2. **手写版如何拆成两个面试题？** 双向链表节点的插入/删除，以及哈希表映射管理——分开考察再合并
3. **实际工程中的 LRU 变体？** 分片 LRU、带过期时间的 LRU（如 Redis）、基于访问频率的 LFU
4. **并发安全？** 多线程/多 worker 环境下如何保证 LRU 操作的原子性？
5. **空间复杂度分析？** 两种实现分别需要多少额外空间？

---

## 评分标准

| 层级 | 要求 |
|------|------|
| 🟢 及格 | 能用 Map 实现 O(1) 的 get/put |
| 🟡 良好 | 能手写双向链表 + HashMap 版本，理解 LRU 淘汰逻辑 |
| 🔴 优秀 | 能讨论工程变体（分片、过期、并发）、对比 LRU vs LFU、分析空间复杂度 |
