> 🟡 **优先级：P1（高频）** — 大厂路由原理高频考点

# 26 - 简易路由（Hash Router）

## 基本信息

| 项目 | 内容 |
|------|------|
| 分类 | 设计模式与架构 |
| 难度 | ⭐⭐⭐ |
| 考察点 | hashchange 事件、路由表、History API、前端路由原理 |

## 背景

在单页应用（SPA）中，页面不会真正刷新，所有视图的切换都由 JavaScript 控制。Hash Router 利用 URL 中 `#` 的变化来驱动页面切换——hash 变化不会触发页面刷新，同时会触发 `hashchange` 事件，天然适合做路由监听。Vue Router、React Router 的底层原理都与此密切相关。

## 题目要求

实现一个 `HashRouter` 类：

### 核心 API

1. **`addRoute(path, callback)`** — 注册路由，支持动态参数（`:id`）和通配符（`*`）
2. **`navigate(path)`** — 编程式导航，切换 hash 并触发对应 callback
3. **`back()`** — 后退，调用 `history.back()`
4. **`removeRoute(path)`** — 移除路由
5. **`destroy()`** — 销毁实例，移除事件监听

### 行为约束

- 必须监听 `hashchange` 事件来响应路由变化
- 路由匹配优先级：精确匹配 > 动态参数匹配 > 通配符匹配
- 路由参数需解析为对象传入 callback（如 `/user/123` → `{ id: '123' }`）

## 示例

```javascript
const router = new HashRouter();

router.addRoute('/home', (params) => console.log('Home page'));
router.addRoute('/user/:id', (params) => console.log('User', params.id));
router.addRoute('*', (params) => console.log('404 Not Found'));

router.navigate('/home');      // → Home page
router.navigate('/user/123');  // → User 123
router.navigate('/not-exist'); // → 404 Not Found
router.back();                 // → 回退到 /user/123
```

## 约束

1. 不使用任何第三方路由库
2. 路径中的动态参数需 `decodeURIComponent` 解码
3. 相同路径重复 navigate 不应重复触发 callback
