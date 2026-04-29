/**
 * CrossTab - 跨标签页通信类
 *
 * 自动选择 BroadcastChannel（优先）或 localStorage storage 事件（降级）
 * 支持消息类型区分、通配符监听、资源清理
 *
 * @example
 * const tab = new CrossTab('my-app');
 * tab.on('LOGIN', (payload) => console.log(payload));
 * tab.post('LOGIN', { userId: '123' });
 * tab.destroy();
 */
class CrossTab {
  /**
   * @param {string} channelName - 通道名称，同名实例共享通信
   */
  constructor(channelName) {
    if (typeof channelName !== 'string' || !channelName) {
      throw new TypeError('CrossTab: channelName 必须为非空字符串');
    }

    this._channelName = channelName;
    this._listeners = new Map();        // type -> Set<callback>
    this._destroyed = false;
    // 每个实例唯一标识，用于排除自身回显
    this._senderId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // ---------- BroadcastChannel 优先 ----------
    this._useBC = typeof BroadcastChannel !== 'undefined';

    if (this._useBC) {
      this._bc = new BroadcastChannel(channelName);
      this._bc.onmessage = (event) => this._dispatch(event.data);
    } else {
      // ---------- localStorage 降级 ----------
      this._storageKey = `__crosstab_${channelName}`;
      this._onStorage = (event) => {
        // storage 事件只在 其他标签页 修改 localStorage 时触发
        // 且仅当 key 匹配且值确实发生变化时
        if (!event.key || !event.key.startsWith(this._storageKey) || event.newValue === null) return;

        try {
          const message = JSON.parse(event.newValue);
          this._dispatch(message);
          // 消费后清理，避免残留
          localStorage.removeItem(event.key);
        } catch {
          // 非本模块写入的数据，忽略
        }
      };
      window.addEventListener('storage', this._onStorage);
    }
  }

  /**
   * 广播消息到其他同源标签页
   *
   * @param {string} type    - 消息类型，如 'LOGIN'、'LOGOUT'
   * @param {*}      payload - 消息载荷（需可 JSON 序列化）
   */
  post(type, payload) {
    if (this._destroyed) {
      console.warn('CrossTab: 实例已销毁，无法发送消息');
      return;
    }

    const message = {
      type,
      payload,
      senderId: this._senderId,       // 用于排除自身回显
      timestamp: Date.now(),
    };

    if (this._useBC) {
      // BroadcastChannel 自带 postMessage
      this._bc.postMessage(message);
    } else {
      // 降级：写入 localStorage，触发 storage 事件
      // 临时 key 携带时间戳确保每次写入都算"值变化"
      const key = `${this._storageKey}_${Date.now()}`;
      try {
        localStorage.setItem(key, JSON.stringify(message));
        // 立即清理：storage 事件已由浏览器异步分发给其他标签页
        // 这里短暂保留后清理，防止 key 堆积
        setTimeout(() => localStorage.removeItem(key), 100);
      } catch (e) {
        // localStorage 满或隐私模式下写入失败
        console.warn('CrossTab: localStorage 写入失败', e);
      }
    }
  }

  /**
   * 订阅指定类型的消息
   *
   * @param {string}   type     - 消息类型，'*' 表示监听所有消息
   * @param {Function} callback - 回调函数
   *                                 type 为 '*' 时：callback(msgType, payload)
   *                                 其他：callback(payload)
   */
  on(type, callback) {
    if (this._destroyed) return this;

    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Set());
    }
    this._listeners.get(type).add(callback);
    return this; // 链式调用
  }

  /**
   * 取消订阅
   *
   * @param {string}   type     - 消息类型
   * @param {Function} callback - 要移除的回调（必须是同一引用）
   */
  off(type, callback) {
    const cbs = this._listeners.get(type);
    if (cbs) {
      cbs.delete(callback);
      if (cbs.size === 0) this._listeners.delete(type);
    }
    return this;
  }

  /**
   * 销毁实例，释放所有资源
   */
  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    if (this._useBC) {
      // 关闭 BroadcastChannel，释放底层资源
      this._bc.close();
      this._bc = null;
    } else {
      // 移除 storage 事件监听
      window.removeEventListener('storage', this._onStorage);
      // 清理可能残留的 localStorage key
      try {
        const prefix = this._storageKey;
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) keysToRemove.push(k);
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {
        // ignore
      }
    }

    this._listeners.clear();
  }

  // ==================== 私有方法 ====================

  /**
   * 分发消息到匹配的监听器
   * @private
   */
  _dispatch(message) {
    // 排除自身发出的消息
    if (message.senderId === this._senderId) return;

    const { type, payload } = message;

    // 1. 触发精确匹配的监听器
    const exactListeners = this._listeners.get(type);
    if (exactListeners) {
      exactListeners.forEach((cb) => {
        try { cb(payload); } catch (e) { console.error('CrossTab listener error:', e); }
      });
    }

    // 2. 触发通配符 '*' 监听器
    const wildcardListeners = this._listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach((cb) => {
        try { cb(type, payload); } catch (e) { console.error('CrossTab listener error:', e); }
      });
    }
  }
}

// ==================== 使用示例 ====================

// --- 标签页 A：发送登录消息 ---
// const tabA = new CrossTab('my-app');
// tabA.post('LOGIN', { userId: '123', name: 'Alice' });

// --- 标签页 B：监听登录消息 ---
// const tabB = new CrossTab('my-app');
// tabB.on('LOGIN', (payload) => {
//   console.log('用户已登录:', payload.name);
// });
// tabB.on('*', (type, payload) => {
//   console.log('[通配符] 收到消息:', type, payload);
// });

// --- 清理 ---
// tabA.destroy();
// tabB.destroy();
