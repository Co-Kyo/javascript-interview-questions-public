class EventEmitter {
  constructor() {
    this._events = new Map();
  }

  on(event, fn) {
    if (!this._events.has(event)) {
      this._events.set(event, []);
    }
    this._events.get(event).push(fn);
    return this;
  }

  off(event, fn) {
    const listeners = this._events.get(event);
    if (!listeners) return this;

    let idx = listeners.indexOf(fn);
    if (idx === -1) {
      idx = listeners.findIndex(l => l._original === fn);
    }
    if (idx !== -1) {
      listeners.splice(idx, 1);
    }
    if (listeners.length === 0) {
      this._events.delete(event);
    }
    return this;
  }

  emit(event, ...args) {
    const listeners = this._events.get(event);
    if (!listeners || listeners.length === 0) return false;

    const snapshot = [...listeners];
    for (const fn of snapshot) {
      fn.apply(this, args);
    }
    return true;
  }

  once(event, fn) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      fn.apply(this, args);
    };
    wrapper._original = fn;
    return this.on(event, wrapper);
  }

  removeAllListeners(event) {
    if (event === undefined) {
      this._events.clear();
    } else {
      this._events.delete(event);
    }
    return this;
  }

  listenerCount(event) {
    const listeners = this._events.get(event);
    return listeners ? listeners.length : 0;
  }

  eventNames() {
    return [...this._events.keys()];
  }
}

module.exports = EventEmitter;
