const { LRUCacheByMap, LRUCacheByLinkedList } = require('./solution.js');

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error('❌ FAIL:', msg);
  }
}

function runTests(LRUCache, label) {
  console.log(`\n=== ${label} ===`);

  // 基本 get/put
  {
    const cache = new LRUCache(2);
    cache.put(1, 1);
    cache.put(2, 2);
    assert(cache.get(1) === 1, '基本 get');
    cache.put(3, 3);
    assert(cache.get(2) === -1, '淘汰最久未使用');
    cache.put(4, 4);
    assert(cache.get(1) === -1, '再次淘汰');
    assert(cache.get(3) === 3, '保留最近使用');
    assert(cache.get(4) === 4, '保留最近使用');
  }

  // 更新已有 key
  {
    const cache = new LRUCache(2);
    cache.put(1, 1);
    cache.put(2, 2);
    cache.put(1, 10);
    cache.put(3, 3);
    assert(cache.get(2) === -1, '更新 key 后淘汰顺序正确');
    assert(cache.get(1) === 10, '更新后的值');
  }

  // capacity=1
  {
    const cache = new LRUCache(1);
    cache.put(1, 1);
    cache.put(2, 2);
    assert(cache.get(1) === -1, 'capacity=1 淘汰');
    assert(cache.get(2) === 2, 'capacity=1 保留');
    cache.put(3, 3);
    assert(cache.get(2) === -1, 'capacity=1 再次淘汰');
    assert(cache.get(3) === 3, 'capacity=1 保留');
  }

  // 空缓存 get
  {
    const cache = new LRUCache(3);
    assert(cache.get(999) === -1, '空缓存 get 返回 -1');
  }

  // 单元素更新不淘汰
  {
    const cache = new LRUCache(2);
    cache.put(1, 1);
    cache.put(1, 100);
    assert(cache.get(1) === 100, '更新不淘汰');
  }

  // get 更新使用顺序
  {
    const cache = new LRUCache(2);
    cache.put(1, 1);
    cache.put(2, 2);
    cache.get(1);
    cache.put(3, 3);
    assert(cache.get(2) === -1, 'get 后淘汰顺序正确');
    assert(cache.get(1) === 1, 'get 更新了使用顺序');
    assert(cache.get(3) === 3, '新值保留');
  }

  // 连续 get 同一个 key
  {
    const cache = new LRUCache(2);
    cache.put(1, 1);
    cache.put(2, 2);
    cache.get(1);
    cache.get(1);
    cache.get(1);
    cache.put(3, 3);
    assert(cache.get(2) === -1, '连续 get 后淘汰正确');
    assert(cache.get(1) === 1, '连续 get 后值保留');
  }

  // put 更新已存在 key 不触发淘汰
  {
    const cache = new LRUCache(2);
    cache.put(1, 1);
    cache.put(2, 2);
    cache.put(1, 10);
    assert(cache.get(1) === 10, '更新后值正确');
    assert(cache.get(2) === 2, '更新不触发淘汰');
  }

  console.log(`✅ ${label} 全部通过`);
}

runTests(LRUCacheByMap, 'Map 版');
runTests(LRUCacheByLinkedList, '双向链表版');

console.log(`\n总计: ${passed}/${passed + failed} 通过`);
if (failed > 0) process.exit(1);
