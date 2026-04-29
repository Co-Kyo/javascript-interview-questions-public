/**
 * EventEmitter - 发布订阅模式实现
 * 支持 on/off/emit/once/removeAllListeners
 */
class EventEmitter {
  constructor() {
    // 用 Map 存储事件与监听器的映射关系
    // key: 事件名(string)  value: 监听器数组
    this._events = new Map();
  }

  /**
   * 注册事件监听器
   * @param {string} event - 事件名
   * @param {Function} fn - 监听函数
   * @returns {EventEmitter} 支持链式调用
   */
  on(event, fn) {
    if (!this._events.has(event)) {
      this._events.set(event, []);
    }
    this._events.get(event).push(fn);
    return this;
  }

  /**
   * 移除指定事件的特定监听器
   * 精确匹配函数引用，使用 indexOf + splice 而非 filter（性能更优）
   * @param {string} event - 事件名
   * @param {Function} fn - 要移除的监听函数（必须是同一引用）
   * @returns {EventEmitter}
   */
  off(event, fn) {
    const listeners = this._events.get(event);
    if (!listeners) return this;

    // 精确匹配：直接匹配 fn，或匹配 once wrapper 的 _original 引用
    let idx = listeners.indexOf(fn);
    if (idx === -1) {
      // 尝试匹配 once 注册的 wrapper（检查 _original 属性）
      idx = listeners.findIndex(l => l._original === fn);
    }
    if (idx !== -1) {
      listeners.splice(idx, 1);
    }
    // 清理空数组，避免内存泄漏
    if (listeners.length === 0) {
      this._events.delete(event);
    }
    return this;
  }

  /**
   * 触发事件，依次调用所有监听器
   * 先复制一份监听器快照，防止在回调中修改监听器列表导致遍历异常
   * @param {string} event - 事件名
   * @param  {...any} args - 传递给监听器的参数
   * @returns {boolean} 是否有监听器被调用
   */
  emit(event, ...args) {
    const listeners = this._events.get(event);
    if (!listeners || listeners.length === 0) return false;

    // 复制一份快照，避免回调中 off/once 修改原数组导致遍历问题
    const snapshot = [...listeners];
    for (const fn of snapshot) {
      fn.apply(this, args);
    }
    return true;
  }

  /**
   * 注册一次性监听器，触发后自动移除
   * 实现技巧：用一个 wrapper 函数包裹，在调用前先 off 自身
   * @param {string} event - 事件名
   * @param {Function} fn - 监听函数
   * @returns {EventEmitter}
   */
  once(event, fn) {
    const wrapper = (...args) => {
      this.off(event, wrapper);  // 先移除，再调用
      fn.apply(this, args);
    };
    // 保存原始函数引用，支持 off(原始函数) 精确移除
    wrapper._original = fn;
    return this.on(event, wrapper);
  }

  /**
   * 移除指定事件的所有监听器
   * 若不传 event，则移除所有事件的所有监听器
   * @param {string} [event] - 事件名（可选）
   * @returns {EventEmitter}
   */
  removeAllListeners(event) {
    if (event === undefined) {
      this._events.clear();
    } else {
      this._events.delete(event);
    }
    return this;
  }

  /**
   * 返回指定事件的监听器数量
   * @param {string} event - 事件名
   * @returns {number}
   */
  listenerCount(event) {
    const listeners = this._events.get(event);
    return listeners ? listeners.length : 0;
  }

  /**
   * 返回所有已注册事件的名称列表
   * @returns {string[]}
   */
  eventNames() {
    return [...this._events.keys()];
  }
}

module.exports = EventEmitter;
