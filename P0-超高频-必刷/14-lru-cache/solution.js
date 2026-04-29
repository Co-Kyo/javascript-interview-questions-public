class LRUCacheByMap {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return -1;

    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  put(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }
}


class DLinkedNode {
  constructor(key = 0, value = 0) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}


class LRUCacheByLinkedList {
  constructor(capacity) {
    this.capacity = capacity;
    this.size = 0;
    this.cache = new Map();

    this.head = new DLinkedNode();
    this.tail = new DLinkedNode();
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  _addToTail(node) {
    node.prev = this.tail.prev;
    node.next = this.tail;
    this.tail.prev.next = node;
    this.tail.prev = node;
  }

  _removeNode(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _moveToTail(node) {
    this._removeNode(node);
    this._addToTail(node);
  }

  get(key) {
    const node = this.cache.get(key);
    if (!node) return -1;

    this._moveToTail(node);
    return node.value;
  }

  put(key, value) {
    const existingNode = this.cache.get(key);

    if (existingNode) {
      existingNode.value = value;
      this._moveToTail(existingNode);
      return;
    }

    if (this.size >= this.capacity) {
      const lruNode = this.head.next;
      this._removeNode(lruNode);
      this.cache.delete(lruNode.key);
      this.size--;
    }

    const newNode = new DLinkedNode(key, value);
    this._addToTail(newNode);
    this.cache.set(key, newNode);
    this.size++;
  }
}

module.exports = { LRUCacheByMap, LRUCacheByLinkedList };
