> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 03 防抖 debounce & 节流 throttle

> 分类：JavaScript 核心手写 | 难度：⭐⭐ | 考察点：闭包、定时器、时间戳、高频事件优化

---

## 背景

在前端开发中，有些事件会被高频触发，例如：

- **搜索框输入**：用户快速打字时，每次 `input` 事件都会触发搜索请求，造成大量无谓的网络请求
- **滚动监听**：`scroll` 事件在滚动过程中每帧可能触发数十次
- **窗口 resize**：拖拽窗口边缘时持续触发
- **按钮点击**：防止用户连续快速点击导致重复提交

如果不加以控制，这些高频事件会导致：
1. 大量重复的网络请求，浪费带宽和服务端资源
2. 频繁的 DOM 操作导致页面卡顿、掉帧
3. 逻辑被重复执行，产生非预期的行为

**防抖（debounce）** 和 **节流（throttle）** 是解决这类问题的两种经典策略。

---

## 题目要求

### 1. 实现 `debounce(fn, delay, options)`

```js
/**
 * 创建一个防抖函数，在 delay 毫秒内没有新调用时才执行 fn
 *
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @param {Object} [options] - 配置项
 * @param {boolean} [options.leading=false] - 是否在延迟开始前立即执行（首次触发）
 * @param {boolean} [options.trailing=true] - 是否在延迟结束后执行（最后一次触发）
 * @returns {Function} 防抖后的函数，带 cancel() 方法取消待执行的调用
 */
function debounce(fn, delay, options = {}) {
  // 你的实现
}
```

**行为说明：**
- 默认模式（`trailing: true`）：事件停止触发后，等待 `delay` 毫秒执行最后一次
- `leading: true`：第一次触发时立即执行，之后在 `delay` 内的调用被忽略
- `leading: true, trailing: true`：首次立即执行，最后一次也会在 `delay` 后执行（需保证 `delay` 内只有一次 trailing 调用）
- 返回的函数必须有 `cancel()` 方法，用于取消挂起的执行

### 2. 实现 `throttle(fn, interval, options)`

```js
/**
 * 创建一个节流函数，每隔 interval 毫秒最多执行一次 fn
 *
 * @param {Function} fn - 要节流的函数
 * @param {number} interval - 节流间隔（毫秒）
 * @param {Object} [options] - 配置项
 * @param {boolean} [options.leading=true] - 是否在节流开始时立即执行
 * @param {boolean} [options.trailing=true] - 是否在节流结束后补执行最后一次
 * @returns {Function} 节流后的函数，带 cancel() 方法
 */
function throttle(fn, interval, options = {}) {
  // 你的实现
}
```

**行为说明：**
- 默认模式（`leading: true, trailing: true`）：首次立即执行，之后每 `interval` 毫秒最多执行一次，最后一次调用会在下一个节流周期结束时补执行
- `leading: false`：第一次触发不立即执行，等待 `interval` 后首次执行
- `trailing: false`：只在节流时间点执行，不补执行尾部调用
- 返回的函数必须有 `cancel()` 方法

---

## 示例

### 示例 1：搜索输入防抖

```js
const searchInput = document.getElementById('search');

function doSearch(query) {
  console.log('搜索:', query);
  // fetch(`/api/search?q=${query}`)
}

const debouncedSearch = debounce(doSearch, 300);

searchInput.addEventListener('input', (e) => {
  debouncedSearch(e.target.value);
});

// 用户快速输入 "hello"：
// 触发: h → he → hel → hell → hello
// 实际执行: 只在停止输入 300ms 后执行一次 doSearch("hello")
```

### 示例 2：滚动节流

```js
const container = document.getElementById('container');

function onScroll() {
  console.log('处理滚动位置:', container.scrollTop);
  // 更新吸顶导航、懒加载图片等
}

const throttledScroll = throttle(onScroll, 100);

container.addEventListener('scroll', throttledScroll);

// 滚动过程中每 100ms 最多执行一次 onScroll
// 而不是每一帧（~16ms）都执行
```

### 示例 3：leading + trailing 组合

```js
const btn = document.getElementById('submit');

function submit() {
  console.log('提交表单');
}

// 点击立即响应，防止连续点击，但最后一次点击也会延迟执行
const throttledSubmit = throttle(submit, 1000, { leading: true, trailing: true });

btn.addEventListener('click', throttledSubmit);

// 快速点击 3 次：
// t=0ms:    立即执行 submit() (leading)
// t=200ms:  被节流，不执行
// t=500ms:  被节流，不执行
// t=1000ms: 补执行 submit() (trailing)
```

### 示例 4：Node.js 可运行验证

```js
// 直接 node 运行，无需浏览器环境
const { debounce, throttle } = require('./solution.js');

// 防抖验证
let debounceCount = 0;
const debounced = debounce(() => { debounceCount++; }, 200);
debounced(); debounced(); debounced();
setTimeout(() => console.log('debounce 执行次数:', debounceCount), 400); // → 1

// 节流验证
let throttleCount = 0;
const throttled = throttle(() => { throttleCount++; }, 300);
throttled(); throttled(); throttled();
setTimeout(() => console.log('throttle 执行次数:', throttleCount), 500); // → 2
```

---

## 约束

1. **纯 JavaScript 实现**，不依赖 `lodash`、`underscore` 等第三方库
2. 必须使用 **闭包** 管理内部状态（定时器 ID、时间戳等）
3. 返回的函数必须支持 `cancel()` 方法
4. `this` 上下文和参数必须正确传递
5. 考虑 `leading` 和 `trailing` 各种组合的边界情况

---

## 评分标准

| 维度 | 权重 | 说明 |
|------|------|------|
| 基础实现 | 40% | debounce 和 throttle 核心逻辑正确 |
| 选项支持 | 25% | leading/trailing 配置正确实现 |
| 边界处理 | 20% | cancel、this 指向、参数传递、首次/末次调用 |
| 代码质量 | 15% | 命名清晰、注释得当、结构优雅 |
