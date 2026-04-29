class HashRouter {
  constructor() {
    this.routes = [];
    this.history = [];
    this._onHashChange = this._handleHashChange.bind(this);
    window.addEventListener('hashchange', this._onHashChange);
    if (window.location.hash) {
      this._handleHashChange();
    }
  }

  addRoute(path, callback) {
    const { regex, paramNames } = this._pathToRegex(path);
    const specificity = this._calcSpecificity(path);
    this.routes.push({ path, callback, regex, paramNames, specificity });
    this.routes.sort((a, b) => b.specificity - a.specificity);
  }

  removeRoute(path) {
    this.routes = this.routes.filter(route => route.path !== path);
  }

  navigate(path) {
    const normalizedPath = this._normalizePath(path);
    const currentPath = this._normalizePath(window.location.hash.slice(1) || '/');
    if (normalizedPath === currentPath) return;

    this.history.push(window.location.hash);
    window.location.hash = path;
  }

  back() {
    if (this.history.length > 0) {
      this.history.pop();
      window.history.back();
    } else {
      window.location.hash = '';
    }
  }

  destroy() {
    window.removeEventListener('hashchange', this._onHashChange);
    this.routes = [];
    this.history = [];
  }

  _handleHashChange() {
    const hash = window.location.hash.slice(1) || '/';
    const path = this._normalizePath(hash);

    for (const route of this.routes) {
      const match = path.match(route.regex);
      if (match) {
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = decodeURIComponent(match[index + 1]);
        });
        route.callback(params);
        return;
      }
    }

    const wildcardRoute = this.routes.find(r => r.path === '*');
    if (wildcardRoute) {
      wildcardRoute.callback({});
    }
  }

  _pathToRegex(path) {
    const paramNames = [];

    if (path === '*') {
      return { regex: /^\/.*$/, paramNames };
    }

    const regexStr = path.replace(/:([^\/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });

    const regex = new RegExp(`^${regexStr}$`);
    return { regex, paramNames };
  }

  _normalizePath(path) {
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return path;
  }

  _calcSpecificity(path) {
    if (path === '*') return 0;
    const segments = path.split('/').filter(Boolean);
    let score = 0;
    for (const seg of segments) {
      if (seg === '*') {
        score += 0;
      } else if (seg.startsWith(':')) {
        score += 10;
      } else {
        score += 100;
      }
    }
    return score;
  }
}

module.exports = { HashRouter };
