function delegate(parent, selector, eventType, handler) {
  function listener(e) {
    let target = e.target;

    while (target && target !== parent) {
      if (target.matches(selector)) {
        handler.call(target, e);
        return;
      }
      target = target.parentElement;
    }

    if (parent.matches(selector)) {
      handler.call(parent, e);
    }
  }

  parent.addEventListener(eventType, listener);

  let bound = true;
  return function unbind() {
    if (!bound) return;
    bound = false;
    parent.removeEventListener(eventType, listener);
  };
}

module.exports = delegate;
