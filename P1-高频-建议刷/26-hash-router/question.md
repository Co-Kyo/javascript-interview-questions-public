> 🟡 **优先级：P1（高频）** — 大厂路由原理高频考点

# 26 - 简易路由（Hash Router）

## 基本信息

| 项目 | 内容 |
|------|------|
| 分类 | 设计模式与架构 |
| 难度 | ⭐⭐⭐ |
| 考察点 | hashchange 事件、路由表、History API、前端路由原理 |

## 背景

在单页应用（SPA）中，页面不会真正刷新，所有视图的切换都由 JavaScript 控制。为了让用户可以通过 URL 直接访问某个页面，同时支持浏览器的前进/后退按钮，前端路由应运而生。

Hash Router 是最经典的前端路由实现方式之一。Vue Router、React Router 的底层原理都与此密切相关。它利用 URL 中 `#`（hash）部分的变化来驱动页面切换，核心优势在于 **hash 变化不会触发页面刷新**，同时会触发 `hashchange` 事件，天然适合做路由监听。

## 题目要求

请实现一个 `HashRouter` 类，具备以下能力：

### 核心 API

1. **`addRoute(path, callback)`** — 注册路由
   - `path` 为路由路径字符串，如 `/home`、`/user/:id`、`/about`
   - `callback` 为匹配到该路由时的回调函数
   - 支持动态参数（如 `:id`），匹配时将参数解析后传入 callback
   - 支持通配符 `*`，用于匹配所有未定义的路由（404 页面）

2. **`navigate(path)`** — 编程式导航
   - 将当前 URL 的 hash 部分切换为指定路径
   - 触发对应路由的 callback

3. **`back()`** — 后退
   - 模拟浏览器后退，调用 `history.back()`

### 行为约束

- 必须监听 `hashchange` 事件来响应路由变化
- 路由匹配优先级：精确匹配 > 动态参数匹配 > 通配符匹配
- 路由参数需解析为对象传入 callback（如 `/user/123` → `{ id: '123' }`）

## 示例

```javascript
const router = new HashRouter();

// 注册路由
router.addRoute('/home', (params) => {
  console.log('Home page', params);
});

router.addRoute('/user/:id', (params) => {
  console.log('User page', params); // { id: '123' }
});

router.addRoute('*', (params) => {
  console.log('404 Not Found');
});

// 编程式导航
router.navigate('/home');
// → hash 变为 #/home → 触发 callback → 输出 "Home page {}"

router.navigate('/user/123');
// → hash 变为 #/user/123 → 触发 callback → 输出 "User page { id: '123' }"

router.navigate('/not-exist');
// → hash 变为 #/not-exist → 匹配通配符 * → 输出 "404 Not Found"

// 浏览器后退
router.back();
// → hash 回退到 #/user/123 → 触发对应 callback
```

## 评分标准

| 等级 | 标准 |
|------|------|
| ✅ 及格 | 正确监听 hashchange，实现基本路由匹配与 navigate |
| 🟢 良好 | 支持动态参数解析、通配符匹配、路由优先级 |
| 🌟 优秀 | 代码结构清晰、边界处理完善、支持 removeRoute、具备可扩展性 |
