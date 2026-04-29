class Subject {
  constructor() {
    this.observers = new Set();
  }

  subscribe(observer) {
    if (typeof observer !== 'object' || typeof observer.update !== 'function') {
      throw new TypeError('Observer must be an object with an update() method');
    }
    this.observers.add(observer);
    return this;
  }

  unsubscribe(observer) {
    this.observers.delete(observer);
    return this;
  }

  notify(data) {
    for (const observer of [...this.observers]) {
      observer.update(data);
    }
  }
}

class Observer {
  constructor(name, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Observer callback must be a function');
    }
    this.name = name;
    this.callback = callback;
  }

  update(data) {
    this.callback(data);
  }
}

class EventBus {
  constructor() {
    this.events = new Map();
  }

  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('EventBus.on() callback must be a function');
    }
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
    return this;
  }

  off(event, callback) {
    if (!this.events.has(event)) return this;
    if (callback) {
      const filtered = this.events.get(event).filter(
        cb => cb !== callback && cb._original !== callback
      );
      if (filtered.length === 0) {
        this.events.delete(event);
      } else {
        this.events.set(event, filtered);
      }
    } else {
      this.events.delete(event);
    }
    return this;
  }

  emit(event, ...args) {
    if (!this.events.has(event)) return;
    for (const callback of [...this.events.get(event)]) {
      callback(...args);
    }
  }

  once(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('EventBus.once() callback must be a function');
    }
    const wrapper = (...args) => {
      callback(...args);
      this.off(event, wrapper);
    };
    wrapper._original = callback;
    this.on(event, wrapper);
    return this;
  }
}

module.exports = { Subject, Observer, EventBus };
