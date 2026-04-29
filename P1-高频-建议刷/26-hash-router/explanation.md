# Hash Router - 五步讲解

## 第一步：理解 Hash 路由的核心机制

### 什么是 Hash 路由？

URL 中 `#` 后面的部分称为 hash（片段标识符）。它的两个关键特性使其天然适合做前端路由：

1. **hash 变化不会触发页面刷新** — 浏览器认为 `#` 是页面内的锚点跳转
2. **hash 变化会触发 `hashchange` 事件** — JavaScript 可以监听并响应

```
https://example.com/#/home
                    ↑
                    这部分就是 hash，变化时不刷新页面
```

### hashchange 事件

```javascript
window.addEventListener('hashchange', () => {
  console.log('Hash changed to:', window.location.hash);
  // 根据新的 hash 值匹配路由并执行对应逻辑
});
```

这就是 Hash Router 的核心：监听 hashchange → 解析路径 → 匹配路由 → 执行回调。

---

## 第二步：设计路由表与路径匹配

### 路由表结构

路由表是 Hash Router 的"大脑"，存储所有已注册的路由规则：

```javascript
// 路由表中的每一项
{
  path: '/user/:id',           // 用户定义的路径模式
  callback: (params) => {},    // 匹配时的回调
  regex: /^\/user\/([^\/]+)$/, // 编译后的正则
  paramNames: ['id']           // 提取的参数名列表
}
```

### 路径模式 → 正则表达式

将路径模式转换为正则表达式是匹配的关键：

| 路径模式 | 正则表达式 | 说明 |
|---------|-----------|------|
| `/home` | `/^\/home$/` | 精确匹配 |
| `/user/:id` | `/^\/user\/([^\/]+)$/` | `:id` 变为捕获组 |
| `/post/:cat/:id` | `/^\/post\/([^\/]+)\/([^\/]+)$/` | 多个动态参数 |
| `*` | `/^\/.*$/` | 通配符，匹配一切 |

核心转换逻辑：

```javascript
const regexStr = path.replace(/:([^\/]+)/g, (_, name) => {
  paramNames.push(name);    // 收集参数名
  return '([^/]+)';         // 替换为正则捕获组
});
```

---

## 第三步：实现路由匹配与参数解析

### 匹配流程

当 hash 变化时，按以下顺序匹配：

1. **获取当前路径**：从 `window.location.hash` 提取并规范化
2. **遍历路由表**：用每个路由的正则逐一匹配
3. **提取参数**：正则的捕获组对应动态参数值
4. **执行回调**：将参数对象传给 callback
5. **兜底处理**：无匹配时查找通配符 `*` 路由

```javascript
_handleHashChange() {
  const hash = window.location.hash.slice(1) || '/';
  const path = this._normalizePath(hash);

  for (const route of this.routes) {
    const match = path.match(route.regex);
    if (match) {
      // match[1], match[2]... 对应 (:id), (:category) 等捕获组
      const params = {};
      route.paramNames.forEach((name, index) => {
        params[name] = decodeURIComponent(match[index + 1]);
      });
      route.callback(params);
      return;
    }
  }

  // 404 兜底
  const wildcard = this.routes.find(r => r.path === '*');
  if (wildcard) wildcard.callback({});
}
```

### 路由优先级

匹配时的优先级规则很重要：

```
精确匹配 (/home) > 动态参数 (/user/:id) > 通配符 (*)
```

实现上，通过 `_calcSpecificity()` 方法为每条路由计算特异性分数：
- 精确匹配段：100 分
- 动态参数段（`:param`）：10 分
- 通配符 `*`：0 分

每次 `addRoute` 时按分数降序排序，确保高特异性路由优先匹配：

```javascript
addRoute(path, callback) {
  const { regex, paramNames } = this._pathToRegex(path);
  const specificity = this._calcSpecificity(path);
  this.routes.push({ path, callback, regex, paramNames, specificity });
  this.routes.sort((a, b) => b.specificity - a.specificity);
}
```

这样无论注册顺序如何，`/user/me`（200分）始终优先于 `/user/:id`（110分）匹配。

---

## 第四步：实现编程式导航与历史管理

### navigate — 编程式导航

```javascript
navigate(path) {
  this.history.push(window.location.hash); // 记录当前路径
  window.location.hash = path;             // 修改 hash → 自动触发 hashchange
}
```

注意：直接修改 `window.location.hash` 就会触发 `hashchange` 事件，不需要手动调用匹配逻辑。同时，如果目标路径与当前路径相同，`navigate` 会直接返回，避免重复触发。

### back — 后退

```javascript
back() {
  if (this.history.length > 0) {
    this.history.pop();
    window.history.back(); // 浏览器原生后退
  } else {
    window.location.hash = ''; // 无历史时回到首页
  }
}
```

这里利用了浏览器的 History API。`window.history.back()` 会让浏览器回到上一个 hash 状态，hash 变化后又会触发 `hashchange`，从而自动匹配路由。同时维护 `this.history` 栈用于判断是否有历史记录可回退。

### History API 与 Hash Router 的关系

| 方面 | Hash Router | History Router |
|------|------------|----------------|
| URL 格式 | `/#/path` | `/path` |
| API | hashchange | pushState / popstate |
| 服务端 | 无需配置 | 需要 fallback 配置 |
| 兼容性 | IE8+ | IE10+ |
| 美观度 | URL 带 `#` | 干净的 URL |

---

## 第五步：完整实现与边界考量

### 完整代码要点

```javascript
class HashRouter {
  constructor() {
    this.routes = [];                                    // 路由表
    this.history = [];                                   // 历史栈
    this._onHashChange = this._handleHashChange.bind(this);
    window.addEventListener('hashchange', this._onHashChange);
    if (window.location.hash) this._handleHashChange();  // 初始匹配
  }

  addRoute(path, callback) { /* 注册路由，按特异性排序 */ }
  navigate(path) { /* 编程式导航，去重 */ }
  back() { /* 后退 */ }
  destroy() { /* 销毁，移除监听 */ }
  _pathToRegex(path) { /* 路径转正则 */ }
  _normalizePath(path) { /* 路径规范化 */ }
  _calcSpecificity(path) { /* 计算路由特异性分数 */ }
}
```

### 生产环境需要考虑的边界问题

| 问题 | 解决方案 |
|------|---------|
| 路由嵌套 | 支持子路由（children），递归匹配 |
| 路由守卫 | 添加 beforeEnter、afterEnter 钩子 |
| 路由懒加载 | callback 支持返回 Promise / 动态 import |
| 编码问题 | 路径中的中文/特殊字符需要 encodeURIComponent |
| 内存泄漏 | 提供 destroy() 方法移除事件监听 |
| SSR 兼容 | 检测 window 是否存在，服务端跳过事件绑定 |
| 重复导航 | navigate 时判断是否为相同路径，避免重复触发 |

### 面试加分项

1. **提到 History API 的 pushState** — 说明你知道两种路由模式的区别
2. **提到路由守卫机制** — 展示你理解真实框架的设计
3. **提到导航守卫的 next() 机制** — 路由拦截的核心设计
4. **提到 Vue Router / React Router 的实现差异** — 展示广度
5. **主动讨论优缺点** — Hash Router 兼容性好但 URL 不美观，History Router 美观但需要服务端配合
