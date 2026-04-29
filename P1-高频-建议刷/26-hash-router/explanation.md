# Hash Router - 五步讲解

## 第一步：理解 Hash 路由的核心机制

URL 中 `#` 后面的部分称为 hash（片段标识符）。它的两个关键特性使其天然适合做前端路由：

1. **hash 变化不会触发页面刷新** — 浏览器认为 `#` 是页面内的锚点跳转
2. **hash 变化会触发 `hashchange` 事件** — JavaScript 可以监听并响应

> `https://example.com/#/home`
>
> ↑ 这部分就是 hash，变化时不刷新页面

这就是 Hash Router 的核心：监听 hashchange → 解析路径 → 匹配路由 → 执行回调。

---

## 第二步：设计路由表与路径匹配

### 路由表结构

路由表存储所有已注册的路由规则：

```javascript
{
  path: '/user/:id',
  callback: (params) => {},
  regex: /^\/user\/([^\/]+)$/,
  paramNames: ['id']
}
```

每个路由条目包含四个字段：`path` 是用户定义的路径模式，`callback` 是匹配成功时执行的回调函数，`regex` 是由路径模式编译后的正则表达式，`paramNames` 是从路径中提取的参数名列表（如 `:id` 中的 `id`）。

### 路径模式 → 正则表达式

| 路径模式 | 正则表达式 | 说明 |
|---------|-----------|------|
| `/home` | `/^\/home$/` | 精确匹配 |
| `/user/:id` | `/^\/user\/([^\/]+)$/` | `:id` 变为捕获组 |
| `*` | `/^\/.*$/` | 通配符，匹配一切 |

核心转换逻辑：

```javascript
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
```

**`:paramName` 替换为捕获组**：正则的 `([^/]+)` 匹配一个或多个非斜杠字符，同时通过 `paramNames` 数组收集参数名，匹配后用索引对应。

---

## 第三步：路由匹配与参数解析

### 匹配流程

```javascript
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
```

**`decodeURIComponent`**：URL 中的中文或特殊字符会被编码，解码后传给回调。

**通配符兜底**：遍历完所有路由都没匹配时，查找 `*` 路由作为 404 兜底。

### 路由优先级

```
精确匹配 (/home) > 动态参数 (/user/:id) > 通配符 (*)
```

通过 `_calcSpecificity()` 为每条路由计算特异性分数：精确匹配段 100 分，动态参数段 10 分，通配符 0 分。每次 `addRoute` 时按分数降序排序，确保高特异性路由优先匹配。

```javascript
addRoute(path, callback) {
  const { regex, paramNames } = this._pathToRegex(path);
  const specificity = this._calcSpecificity(path);
  this.routes.push({ path, callback, regex, paramNames, specificity });
  this.routes.sort((a, b) => b.specificity - a.specificity);
}
```

---

## 第四步：编程式导航与历史管理

### navigate — 编程式导航

```javascript
navigate(path) {
  const normalizedPath = this._normalizePath(path);
  const currentPath = this._normalizePath(window.location.hash.slice(1) || '/');
  if (normalizedPath === currentPath) return;

  this.history.push(window.location.hash);
  window.location.hash = path;
}
```

直接修改 `window.location.hash` 就会触发 `hashchange` 事件，不需要手动调用匹配逻辑。**去重**：目标路径与当前路径相同时直接返回，避免重复触发。

### back — 后退

```javascript
back() {
  if (this.history.length > 0) {
    this.history.pop();
    window.history.back();
  } else {
    window.location.hash = '';
  }
}
```

利用浏览器原生 `history.back()` 回退，hash 变化后自动触发 `hashchange` 匹配路由。

---

## 第五步：常见追问

**Q: Hash Router vs History Router？**

| 方面 | Hash Router | History Router |
|------|------------|----------------|
| URL 格式 | `/#/path` | `/path` |
| API | hashchange | pushState / popstate |
| 服务端 | 无需配置 | 需要 fallback 配置 |
| 兼容性 | IE8+ | IE10+ |

**Q: 如何实现路由守卫？**

添加 `beforeEnter` 钩子，在匹配到路由后、执行 callback 前调用。钩子函数接收 `next` 参数，调用 `next()` 继续，调用 `next('/other')` 重定向。

**Q: 如何支持嵌套路由？**

路由表中每个路由可包含 `children` 子路由数组。匹配时先匹配父路由，再在父路由的 children 中匹配子路由。

---

## 第五步：易错点

| 易错点 | 说明 |
|-------|------|
| 路由不排序 | 注册顺序影响匹配优先级，`/user/me` 可能被 `/user/:id` 先匹配 |
| 正则缺少 `^` 和 `$` | `/user` 的正则如果写成 `/user/` 会匹配 `/user/123` |
| 忘记 decodeURIComponent | URL 中的中文参数会变成 `%E4%B8%AD%E6%96%87` |
| navigate 不去重 | 相同路径重复触发 callback |
| destroy 不移除事件监听 | 内存泄漏，hashchange 回调继续执行 |
