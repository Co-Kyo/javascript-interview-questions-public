/**
 * LRU 缓存 - 前端面试题
 * 实现两种方案：Map 版 & 双向链表 + HashMap 手写版
 */

// ============================================================
// 方案一：利用 ES6 Map 的插入顺序特性
// ============================================================
// ES6 Map 保证迭代顺序为「插入顺序」。
// 每次 get/put 时，将命中的 key 删除后重新插入，即可将其移到「最新」位置。
// Map 的 get / set / delete / has 均为 O(1) 平均时间复杂度。
// ============================================================

// 时间复杂度：get O(1) / put O(1)
// 空间复杂度：O(n)，n = capacity
class LRUCacheByMap {
  /**
   * @param {number} capacity - 缓存容量
   */
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  /**
   * 获取 key 对应的值，同时标记为最近使用
   * @param {number} key
   * @return {number} 值，不存在则返回 -1
   * @complexity O(1)
   */
  get(key) {
    if (!this.cache.has(key)) return -1;

    const value = this.cache.get(key);
    // 标记为最近使用：删除后重新插入，Map 会将其移至末尾
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * 写入或更新键值对
   * @param {number} key
   * @param {number} value
   * @return {void}
   * @complexity O(1)
   */
  put(key, value) {
    // 如果 key 已存在，先删除（后续会重新插入到末尾）
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // 容量已满，淘汰最久未使用的（Map 迭代器第一个元素）
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    // 插入新值（自动排在末尾 = 最近使用）
    this.cache.set(key, value);
  }
}


// ============================================================
// 方案二：双向链表 + HashMap 手写实现
// ============================================================
// 核心思想：
//   - 双向链表维护「使用顺序」，头部 = 最久未使用，尾部 = 最近使用
//   - 哈希表（Map）存储 key → 链表节点的映射，实现 O(1) 查找
//   - get/put 时将节点移到链表尾部
//   - 容量满时删除链表头部节点
//   - 使用哨兵节点（dummy head/tail）简化边界判断
// ============================================================

class DLinkedNode {
  constructor(key = 0, value = 0) {
    this.key = key;    // 存储 key，用于淘汰时从 HashMap 中删除
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

// 时间复杂度：get O(1) / put O(1)
// 空间复杂度：O(n)，n = capacity（HashMap + 双向链表节点）
class LRUCacheByLinkedList {
  /**
   * @param {number} capacity
   */
  constructor(capacity) {
    this.capacity = capacity;
    this.size = 0;
    this.cache = new Map(); // key → DLinkedNode

    // 哨兵节点：head.next 指向最久未使用，tail.prev 指向最近使用
    this.head = new DLinkedNode();
    this.tail = new DLinkedNode();
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /**
   * 将节点插入到链表尾部（标记为最近使用）
   * @param {DLinkedNode} node
   */
  _addToTail(node) {
    node.prev = this.tail.prev;
    node.next = this.tail;
    this.tail.prev.next = node;
    this.tail.prev = node;
  }

  /**
   * 从链表中移除节点
   * @param {DLinkedNode} node
   */
  _removeNode(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  /**
   * 将已存在的节点移到尾部（标记为最近使用）
   * @param {DLinkedNode} node
   */
  _moveToTail(node) {
    this._removeNode(node);
    this._addToTail(node);
  }

  /**
   * 获取值
   * @param {number} key
   * @return {number}
   */
  get(key) {
    const node = this.cache.get(key);
    if (!node) return -1;

    // 访问后移到尾部 = 标记为最近使用
    this._moveToTail(node);
    return node.value;
  }

  /**
   * 写入或更新
   * @param {number} key
   * @param {number} value
   */
  put(key, value) {
    const existingNode = this.cache.get(key);

    if (existingNode) {
      // key 已存在：更新值，移到尾部
      existingNode.value = value;
      this._moveToTail(existingNode);
      return;
    }

    // key 不存在
    if (this.size >= this.capacity) {
      // 容量已满：淘汰头部节点（最久未使用）
      const lruNode = this.head.next;
      this._removeNode(lruNode);
      this.cache.delete(lruNode.key); // 所以节点必须存储 key
      this.size--;
    }

    // 创建新节点，插入尾部 + 写入 HashMap
    const newNode = new DLinkedNode(key, value);
    this._addToTail(newNode);
    this.cache.set(key, newNode);
    this.size++;
  }
}


// ============================================================
// 测试用例
// ============================================================

function runTests() {
  console.log('=== 方案一：Map 版 ===');
  const cache1 = new LRUCacheByMap(2);
  cache1.put(1, 1);
  cache1.put(2, 2);
  console.assert(cache1.get(1) === 1, 'get(1) should be 1');
  cache1.put(3, 3); // 淘汰 key=2
  console.assert(cache1.get(2) === -1, 'get(2) should be -1 after eviction');
  cache1.put(4, 4); // 淘汰 key=1
  console.assert(cache1.get(1) === -1, 'get(1) should be -1 after eviction');
  console.assert(cache1.get(3) === 3, 'get(3) should be 3');
  console.assert(cache1.get(4) === 4, 'get(4) should be 4');
  console.log('Map 版全部通过 ✅');

  console.log('\n=== 方案二：双向链表版 ===');
  const cache2 = new LRUCacheByLinkedList(2);
  cache2.put(1, 1);
  cache2.put(2, 2);
  console.assert(cache2.get(1) === 1, 'get(1) should be 1');
  cache2.put(3, 3); // 淘汰 key=2
  console.assert(cache2.get(2) === -1, 'get(2) should be -1 after eviction');
  cache2.put(4, 4); // 淘汰 key=1
  console.assert(cache2.get(1) === -1, 'get(1) should be -1 after eviction');
  console.assert(cache2.get(3) === 3, 'get(3) should be 3');
  console.assert(cache2.get(4) === 4, 'get(4) should be 4');
  console.log('双向链表版全部通过 ✅');

  console.log('\n=== 更新已有 key 测试 ===');
  const cache3 = new LRUCacheByMap(2);
  cache3.put(1, 1);
  cache3.put(2, 2);
  cache3.put(1, 10); // 更新，key=1 移到最新
  cache3.put(3, 3);  // 淘汰 key=2
  console.assert(cache3.get(2) === -1, 'get(2) should be -1');
  console.assert(cache3.get(1) === 10, 'get(1) should be 10');
  console.log('更新测试通过 ✅');

  console.log('\n=== 边界测试：capacity=1 ===');
  const cache4 = new LRUCacheByLinkedList(1);
  cache4.put(1, 1);
  cache4.put(2, 2); // 淘汰 key=1
  console.assert(cache4.get(1) === -1, 'get(1) should be -1 (capacity=1)');
  console.assert(cache4.get(2) === 2, 'get(2) should be 2 (capacity=1)');
  cache4.put(3, 3); // 淘汰 key=2
  console.assert(cache4.get(2) === -1, 'get(2) should be -1 after second eviction');
  console.assert(cache4.get(3) === 3, 'get(3) should be 3');
  console.log('capacity=1 测试通过 ✅');

  console.log('\n=== 边界测试：空缓存 get ===');
  const cache5 = new LRUCacheByMap(3);
  console.assert(cache5.get(999) === -1, 'get from empty cache should be -1');
  console.log('空缓存测试通过 ✅');

  console.log('\n=== 边界测试：单元素更新不淘汰 ===');
  const cache6 = new LRUCacheByLinkedList(2);
  cache6.put(1, 1);
  cache6.put(1, 100); // 更新，不淘汰
  console.assert(cache6.get(1) === 100, 'get(1) should be 100 after update');
  console.log('单元素更新测试通过 ✅');

  console.log('\n🎉 所有测试通过！');
}

runTests();
