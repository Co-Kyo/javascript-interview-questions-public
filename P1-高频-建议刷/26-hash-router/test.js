/**
 * 26 - 简易路由（Hash Router）— 测试
 * 运行：node test.js
 */

// --- 模拟浏览器环境 ---

let currentHash = '';
const listeners = {};

const mockWindow = {
  location: {
    get hash() { return currentHash; },
    set hash(val) {
      currentHash = val.startsWith('#') ? val : '#' + val;
      if (listeners.hashchange) {
        listeners.hashchange.forEach(fn => fn());
      }
    },
  },
  history: { back() {} },
  addEventListener(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  },
  removeEventListener(event, fn) {
    if (listeners[event]) {
      listeners[event] = listeners[event].filter(f => f !== fn);
    }
  },
};

global.window = mockWindow;
const { HashRouter } = require('./solution.js');

// --- 基本路由注册与匹配 ---

currentHash = '';
const router = new HashRouter();

const log = [];
router.addRoute('/home', (params) => { log.push({ route: 'home', params }); });
router.addRoute('/user/:id', (params) => { log.push({ route: 'user', params }); });
router.addRoute('/post/:category/:postId', (params) => { log.push({ route: 'post', params }); });
router.addRoute('*', (params) => { log.push({ route: '404', params }); });

router.navigate('/home');
console.assert(log.length === 1, 'navigate /home 触发回调');
console.assert(log[0].route === 'home', '匹配到 home 路由');

log.length = 0;
router.navigate('/user/42');
console.assert(log[0].route === 'user', '匹配到 user 路由');
console.assert(log[0].params.id === '42', '动态参数 id 解析正确');

log.length = 0;
router.navigate('/post/tech/101');
console.assert(log[0].params.category === 'tech', '参数 category 正确');
console.assert(log[0].params.postId === '101', '参数 postId 正确');

log.length = 0;
router.navigate('/unknown');
console.assert(log[0].route === '404', '匹配到通配符路由');

// --- 路由优先级 ---

const priorityLog = [];
const priorityRouter = new HashRouter();
priorityRouter.addRoute('/user/:id', (params) => { priorityLog.push('dynamic'); });
priorityRouter.addRoute('/user/me', (params) => { priorityLog.push('exact'); });

priorityRouter.navigate('/user/me');
console.assert(priorityLog[0] === 'exact', '精确匹配优先于动态参数');

priorityLog.length = 0;
priorityRouter.navigate('/user/123');
console.assert(priorityLog[0] === 'dynamic', '动态参数匹配非精确路径');

// --- removeRoute ---

const removeLog = [];
const removeRouter = new HashRouter();
removeRouter.addRoute('/about', () => { removeLog.push('about'); });
removeRouter.addRoute('*', () => { removeLog.push('404'); });

removeRouter.navigate('/about');
console.assert(removeLog[0] === 'about', 'removeRoute 前能匹配');

removeLog.length = 0;
removeRouter.removeRoute('/about');
// 先导航到其他路径重置 hash，再导航回 /about 触发匹配
removeRouter.navigate('/other');
removeLog.length = 0;
removeRouter.navigate('/about');
console.assert(removeLog[0] === '404', 'removeRoute 后不再匹配，走通配符');

// --- navigate 去重 ---

let navCount = 0;
const dedupRouter = new HashRouter();
dedupRouter.addRoute('/test', () => { navCount++; });

currentHash = '';
dedupRouter.navigate('/test');
console.assert(navCount === 1, '首次 navigate 触发');

dedupRouter.navigate('/test');
console.assert(navCount === 1, '相同路径不重复触发');

// --- destroy ---

const destroyRouter = new HashRouter();
let destroyLog = 0;
destroyRouter.addRoute('/destroy-test', () => { destroyLog++; });

destroyRouter.navigate('/destroy-test');
console.assert(destroyLog === 1, 'destroy 前能收到路由');

destroyRouter.destroy();
// 需要重置 hash 才能重新触发
currentHash = '';
destroyRouter.navigate('/destroy-test');
console.assert(destroyLog === 1, 'destroy 后不再收到路由');

// --- 路径规范化 ---

const normLog = [];
const normRouter = new HashRouter();
normRouter.addRoute('/normalize', () => { normLog.push('hit'); });

currentHash = '';
normRouter.navigate('normalize');
console.assert(normLog[0] === 'hit', '不带前导 / 的路径也能匹配');

console.log('✅ 全部通过');
