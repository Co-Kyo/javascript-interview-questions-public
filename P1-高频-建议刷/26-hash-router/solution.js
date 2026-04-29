/**
 * HashRouter - 简易 Hash 路由实现
 *
 * 核心原理：
 * 1. 监听 window 的 hashchange 事件，当 URL 的 hash 部分变化时触发路由匹配
 * 2. 维护一张路由表，每个路由包含路径模式和回调函数
 * 3. 支持动态参数（:param）和通配符（*）匹配
 */
class HashRouter {
  constructor() {
    // 路由表：存储 { path, callback, regex, paramNames } 结构
    this.routes = [];

    // 历史记录栈，用于 back() 操作
    this.history = [];

    // 绑定 hashchange 事件处理函数（使用 bind 保持 this 指向）
    this._onHashChange = this._handleHashChange.bind(this);

    // 监听 hashchange 事件
    window.addEventListener('hashchange', this._onHashChange);

    // 初始化时，如果已有 hash，立即匹配一次
    if (window.location.hash) {
      this._handleHashChange();
    }
  }

  /**
   * 注册路由
   * @param {string} path - 路由路径，支持 /user/:id、* 等模式
   * @param {Function} callback - 匹配时的回调，接收 params 对象
   */
  addRoute(path, callback) {
    const { regex, paramNames } = this._pathToRegex(path);
    const specificity = this._calcSpecificity(path);
    this.routes.push({ path, callback, regex, paramNames, specificity });
    // 按特异性降序排序：精确匹配 > 动态参数 > 通配符
    this.routes.sort((a, b) => b.specificity - a.specificity);
  }

  /**
   * 移除路由
   * @param {string} path - 要移除的路由路径
   */
  removeRoute(path) {
    this.routes = this.routes.filter(route => route.path !== path);
  }

  /**
   * 编程式导航：设置 hash 并触发路由匹配
   * @param {string} path - 目标路径
   */
  navigate(path) {
    // 去重：相同路径不重复触发
    const normalizedPath = this._normalizePath(path);
    const currentPath = this._normalizePath(window.location.hash.slice(1) || '/');
    if (normalizedPath === currentPath) return;

    // 将路径推入历史记录
    this.history.push(window.location.hash);
    // 修改 hash，会自动触发 hashchange 事件
    window.location.hash = path;
  }

  /**
   * 后退：调用 history.back() 模拟浏览器后退
   */
  back() {
    if (this.history.length > 0) {
      this.history.pop();
      // 使用 history.back() 触发浏览器原生后退
      window.history.back();
    } else {
      // 没有历史记录时，清除 hash 回到首页
      window.location.hash = '';
    }
  }

  /**
   * 销毁路由实例，移除事件监听
   */
  destroy() {
    window.removeEventListener('hashchange', this._onHashChange);
    this.routes = [];
    this.history = [];
  }

  /**
   * 处理 hashchange 事件：解析当前 hash 并匹配路由
   * @private
   */
  _handleHashChange() {
    // 获取当前 hash，去掉开头的 #，默认为 /
    const hash = window.location.hash.slice(1) || '/';
    const path = this._normalizePath(hash);

    // 遍历路由表进行匹配
    for (const route of this.routes) {
      const match = path.match(route.regex);
      if (match) {
        // 提取动态参数
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = decodeURIComponent(match[index + 1]);
        });

        // 执行回调，传入解析后的参数
        route.callback(params);
        return;
      }
    }

    // 没有匹配到任何路由，尝试匹配通配符 *
    const wildcardRoute = this.routes.find(r => r.path === '*');
    if (wildcardRoute) {
      wildcardRoute.callback({});
    }
  }

  /**
   * 将路由路径模式转换为正则表达式
   * /user/:id → /^\/user\/([^\/]+)$/
   * /about    → /^\/about$/
   * *         → /^\/.*$/
   * @private
   * @param {string} path - 路由路径模式
   * @returns {{ regex: RegExp, paramNames: string[] }}
   */
  _pathToRegex(path) {
    const paramNames = [];

    if (path === '*') {
      // 通配符匹配任意路径
      return { regex: /^\/.*$/, paramNames };
    }

    // 将 :paramName 替换为捕获组 ([^/]+)
    // 同时收集参数名
    const regexStr = path.replace(/:([^\/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });

    // 构建完整正则，^ 和 $ 确保完全匹配
    const regex = new RegExp(`^${regexStr}$`);

    return { regex, paramNames };
  }

  /**
   * 规范化路径：确保以 / 开头，去掉末尾多余的 /
   * @private
   * @param {string} path
   * @returns {string}
   */
  _normalizePath(path) {
    // 确保以 / 开头
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    // 去掉末尾的 /（但保留根路径 /）
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    return path;
  }

  /**
   * 计算路由路径的特异性分数
   * 精确匹配段 > 动态参数段 > 通配符
   * 用于路由排序，确保匹配优先级正确
   * @private
   * @param {string} path - 路由路径模式
   * @returns {number} 特异性分数（越高越优先）
   */
  _calcSpecificity(path) {
    if (path === '*') return 0;
    const segments = path.split('/').filter(Boolean);
    let score = 0;
    for (const seg of segments) {
      if (seg === '*') {
        score += 0;
      } else if (seg.startsWith(':')) {
        score += 10; // 动态参数
      } else {
        score += 100; // 精确匹配
      }
    }
    return score;
  }
}

// ==================== 使用示例 ====================

const router = new HashRouter();

// 注册精确匹配路由
router.addRoute('/home', (params) => {
  console.log('🏠 Home page');
});

// 注册带动态参数的路由
router.addRoute('/user/:id', (params) => {
  console.log(`👤 User page, id = ${params.id}`);
});

router.addRoute('/post/:category/:postId', (params) => {
  console.log(`📝 Post page, category = ${params.category}, postId = ${params.postId}`);
});

// 注册通配符路由（404 兜底）
router.addRoute('*', (params) => {
  console.log('❌ 404 Not Found');
});

// 导航测试
router.navigate('/home');
// 输出: 🏠 Home page

router.navigate('/user/42');
// 输出: 👤 User page, id = 42

router.navigate('/post/tech/101');
// 输出: 📝 Post page, category = tech, postId = 101

router.navigate('/unknown');
// 输出: ❌ 404 Not Found

// 后退测试
router.back();
// 回退到 /post/tech/101 → 输出: 📝 Post page, category = tech, postId = 101
