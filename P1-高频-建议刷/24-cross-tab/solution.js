class CrossTab {
  constructor(channelName) {
    if (typeof channelName !== 'string' || !channelName) {
      throw new TypeError('CrossTab: channelName 必须为非空字符串');
    }

    this._channelName = channelName;
    this._listeners = new Map();
    this._destroyed = false;
    this._senderId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    this._useBC = typeof BroadcastChannel !== 'undefined';

    if (this._useBC) {
      this._bc = new BroadcastChannel(channelName);
      this._bc.onmessage = (event) => this._dispatch(event.data);
    } else {
      this._storageKey = `__crosstab_${channelName}`;
      this._onStorage = (event) => {
        if (!event.key || !event.key.startsWith(this._storageKey) || event.newValue === null) return;

        try {
          const message = JSON.parse(event.newValue);
          this._dispatch(message);
          localStorage.removeItem(event.key);
        } catch {
        }
      };
      window.addEventListener('storage', this._onStorage);
    }
  }

  post(type, payload) {
    if (this._destroyed) {
      console.warn('CrossTab: 实例已销毁，无法发送消息');
      return;
    }

    const message = {
      type,
      payload,
      senderId: this._senderId,
      timestamp: Date.now(),
    };

    if (this._useBC) {
      this._bc.postMessage(message);
    } else {
      const key = `${this._storageKey}_${Date.now()}`;
      try {
        localStorage.setItem(key, JSON.stringify(message));
        setTimeout(() => localStorage.removeItem(key), 100);
      } catch (e) {
        console.warn('CrossTab: localStorage 写入失败', e);
      }
    }
  }

  on(type, callback) {
    if (this._destroyed) return this;

    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Set());
    }
    this._listeners.get(type).add(callback);
    return this;
  }

  off(type, callback) {
    const cbs = this._listeners.get(type);
    if (cbs) {
      cbs.delete(callback);
      if (cbs.size === 0) this._listeners.delete(type);
    }
    return this;
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;

    if (this._useBC) {
      this._bc.close();
      this._bc = null;
    } else {
      window.removeEventListener('storage', this._onStorage);
      try {
        const prefix = this._storageKey;
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) keysToRemove.push(k);
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {
      }
    }

    this._listeners.clear();
  }

  _dispatch(message) {
    if (message.senderId === this._senderId) return;

    const { type, payload } = message;

    const exactListeners = this._listeners.get(type);
    if (exactListeners) {
      exactListeners.forEach((cb) => {
        try { cb(payload); } catch (e) { console.error('CrossTab listener error:', e); }
      });
    }

    const wildcardListeners = this._listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach((cb) => {
        try { cb(type, payload); } catch (e) { console.error('CrossTab listener error:', e); }
      });
    }
  }
}

module.exports = { CrossTab };
