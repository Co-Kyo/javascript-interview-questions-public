> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# 23 - IntersectionObserver 懒加载

## 分类
DOM 与浏览器 API

## 难度
⭐⭐

## 考察点
- IntersectionObserver API 的理解与使用
- 图片懒加载的实现原理
- 性能优化意识（减少首屏资源请求、节省带宽）
- 浏览器兼容性降级方案

---

## 背景

在电商商品列表、瀑布流图片墙、长图文资讯等场景中，页面可能包含几十甚至上百张图片。如果一次性全部加载，会导致：

- **首屏白屏时间过长**：大量图片请求阻塞渲染
- **带宽浪费**：用户可能只浏览前几屏，下方图片根本不会被看到
- **内存占用过高**：低端设备上可能卡顿甚至崩溃

图片懒加载（Lazy Loading）是解决这类问题的标准方案：**只在图片即将进入可视区域时才发起加载请求**。

---

## 题目要求

实现一个 `lazyLoad` 函数，要求：

1. **使用 `IntersectionObserver`** 监听目标图片元素，当图片进入可视区域时，将 `data-src` 的值赋给 `src`，触发真实图片加载
2. **加载完成后移除 `data-src`**，避免重复监听
3. **支持占位图 fallback**：如果真实图片加载失败，显示一个默认占位图
4. **支持卸载 observer**：图片全部加载完毕后，调用 `disconnect()` 释放资源，返回一个 `destroy` 方法供外部主动销毁
5. **兼容无 IntersectionObserver 的浏览器**：提供降级方案（如 scroll + getBoundingClientRect）

### HTML 结构约定

```html
<img class="lazy" data-src="https://example.com/product-1.jpg" src="placeholder.jpg" alt="商品图">
<img class="lazy" data-src="https://example.com/product-2.jpg" src="placeholder.jpg" alt="商品图">
<img class="lazy" data-src="https://example.com/product-3.jpg" src="placeholder.jpg" alt="商品图">
<!-- ... 更多图片 ... -->
```

### 函数签名

```javascript
/**
 * @param {string} selector - 懒加载图片的 CSS 选择器，默认 '.lazy'
 * @param {object} options - 配置项
 * @param {string} options.placeholder - 加载失败时的占位图 URL
 * @param {number} options.rootMargin - IntersectionObserver rootMargin，提前加载距离(px)
 * @param {number} options.threshold - IntersectionObserver threshold
 * @returns {{ destroy: () => void }} 返回销毁方法
 */
function lazyLoad(selector = '.lazy', options = {}) {
  // 你的实现
}
```

---

## 调用示例

```javascript
// 基本用法
const loader = lazyLoad('.lazy', {
  placeholder: 'https://example.com/placeholder.jpg',
  rootMargin: 200,  // 提前 200px 开始加载
  threshold: 0.01,
});

// 页面卸载时主动销毁
window.addEventListener('beforeunload', () => {
  loader.destroy();
});
```

---

## 约束条件

- 不使用任何第三方库，纯原生 JavaScript 实现
- `IntersectionObserver` 不可用时，使用 `scroll` 事件 + `getBoundingClientRect()` 降级
- 降级方案需要做 **throttle（节流）** 防止 scroll 事件频繁触发
- 图片加载失败时需要设置 fallback 占位图并移除 `data-src`，防止重试死循环
- 代码需要考虑 **动态插入的图片**（可通过 MutationObserver 扩展，但本题不要求）

---

## 评分标准

| 维度 | 说明 | 分值 |
|------|------|------|
| IO 正确使用 | 正确创建 IntersectionObserver、设置 rootMargin/threshold、使用 isIntersecting 判断交叉状态 | 30 |
| 懒加载逻辑 | 正确从 data-src 读取并赋值给 src，加载后清理 data-src，unobserve 已加载元素 | 25 |
| 错误处理 | 加载失败时设置 fallback 占位图，防止重复加载 | 15 |
| 资源释放 | 提供 destroy 方法，disconnect observer，移除事件监听 | 10 |
| 降级方案 | 无 IO 时使用 scroll + getBoundingClientRect + throttle | 15 |
| 代码质量 | 命名清晰、注释合理、边界处理完善 | 5 |
