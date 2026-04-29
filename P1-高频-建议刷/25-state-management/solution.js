function createStore(reducer, initialState) {
  let currentState = initialState;
  let listeners = [];
  let isDispatching = false;

  function getState() {
    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions or read state');
    }
    return currentState;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected the listener to be a function');
    }

    if (listeners.includes(listener)) {
      return () => {};
    }

    listeners.push(listener);

    let isSubscribed = true;
    return function unsubscribe() {
      if (!isSubscribed) return;
      isSubscribed = false;
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  function dispatch(action) {
    if (typeof action !== 'object' || action === null) {
      throw new Error('Actions must be plain objects');
    }
    if (typeof action.type === 'undefined') {
      throw new Error('Actions may not have an undefined "type" property');
    }

    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions');
    }

    try {
      isDispatching = true;
      currentState = reducer(currentState, action);
    } finally {
      isDispatching = false;
    }

    const currentListeners = listeners.slice();
    for (let i = 0; i < currentListeners.length; i++) {
      currentListeners[i]();
    }

    return action;
  }

  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function');
    }
    reducer = nextReducer;
    dispatch({ type: '@@REPLACE' });
  }

  dispatch({ type: '@@INIT' });

  return {
    getState,
    dispatch,
    subscribe,
    replaceReducer,
  };
}


function applyMiddleware(...middlewares) {
  return function (createStoreFn) {
    return function (reducer, initialState) {
      const store = createStoreFn(reducer, initialState);

      let dispatch = () => {
        throw new Error(
          'Dispatching while constructing your middleware is not allowed'
        );
      };

      const middlewareAPI = {
        getState: store.getState,
        dispatch: (action, ...args) => dispatch(action, ...args),
      };

      const chain = middlewares.map((middleware) => middleware(middlewareAPI));
      dispatch = compose(...chain)(store.dispatch);

      return {
        ...store,
        dispatch,
      };
    };
  };
}


function compose(...funcs) {
  if (funcs.length === 0) return (arg) => arg;
  if (funcs.length === 1) return funcs[0];

  return funcs.reduce(
    (a, b) =>
      (...args) =>
        a(b(...args))
  );
}

module.exports = { createStore, applyMiddleware, compose };
