# 23 - IntersectionObserver 懒加载 ｜ 题解讲解

## 第一步：理解问题本质

**懒加载的核心思想是"按需加载"**——用户看不到的图片，不浪费带宽去请求。

传统做法是监听 `scroll` 事件，不断计算图片位置是否进入视口。但这有两个问题：
- `scroll` 事件触发频率极高（每秒几十次），直接计算开销大
- 手动计算 `getBoundingClientRect` 不够精确，且容易出错

**IntersectionObserver** 是浏览器提供的原生 API，专门解决"元素是否进入视口"的检测问题，性能远优于 scroll 方案。

---

## 第二步：IntersectionObserver 核心 API

```javascript
const observer = new IntersectionObserver(callback, options);
```

**三个关键配置项：**

| 参数 | 作用 | 本题中的值 |
|------|------|-----------|
| `root` | 观察的根容器，`null` 表示视口 | `null` |
| `rootMargin` | 扩展/缩小检测区域，类似 CSS margin | `200px`（提前 200px 加载） |
| `threshold` | 回调触发时的目标可见比例 | `0.01`（1% 可见即触发） |

**回调函数接收 `entries` 数组**，每个 entry 包含：
- `entry.isIntersecting`：是否与根容器交叉（进入视口）
- `entry.target`：被观察的 DOM 元素
- `entry.intersectionRatio`：交叉比例（0~1）

调用 `observer.observe(element)` 开始监听，`observer.unobserve(element)` 停止监听单个元素，`observer.disconnect()` 停止所有监听。

---

## 第三步：逐步实现

### 3.1 加载单张图片

```javascript
function loadImage(img) {
  const src = img.dataset.src;
  if (!src) return;

  img.src = src;

  img.onload = () => {
    img.removeAttribute('data-src');
    img.onload = null;
    if (/^\.[a-zA-Z][\w-]*$/.test(selector)) {
      img.classList.remove(selector.slice(1));
    }
  };

  img.onerror = () => {
    img.src = placeholder;
    img.removeAttribute('data-src');
    img.onerror = null;
  };
}
```

**`img.src = src`**：设置真实地址，触发浏览器加载。

**`img.onload` 回调**：加载成功后移除 `data-src` 标记已处理，清理 handler 防止内存泄漏。如果 selector 是简单类选择器（如 `.lazy`），移除该类避免重复匹配和样式解耦。

**`img.onerror` 回调**：加载失败时回退到占位图，同样移除 `data-src` 防止下次回调再次尝试加载同一张坏图（防止死循环）。

**正则 `/^\.[a-zA-Z][\w-]*$/`**：校验 selector 是否为简单的类选择器（如 `.lazy`），避免对复杂选择器（如 `.class1.class2`、`div.lazy`）做错误的类名操作。

### 3.2 IntersectionObserver 主方案

```javascript
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadImage(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    {
      root: null,
      rootMargin: `${rootMargin}px`,
      threshold,
    }
  );

  images.forEach((img) => observer.observe(img));

  return {
    destroy() {
      observer.disconnect();
      images.length = 0;
    },
  };
}
```

**Feature Detection**：`'IntersectionObserver' in window` 检测浏览器是否支持 IO。

**`observer.unobserve(entry.target)`**：每张图片只应加载一次，加载后继续监听是浪费资源。

**`observer.disconnect()`**：在 `destroy` 方法中停止所有观察，释放资源。

### 3.3 scroll 降级方案

```javascript
let ticking = false;

function onScroll() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(() => {
      checkImages();
      ticking = false;
    });
  }
}
```

**为什么用 rAF 而不是 setTimeout？** rAF 与浏览器刷新率同步（通常 60fps），不会过度触发。浏览器在页面不可见时会自动暂停 rAF，节省资源。

**判断图片是否进入视口的公式：** `rect.top <= viewportHeight + rootMargin`，即图片顶部到视口顶部的距离 ≤ 视口高度 + 提前加载距离。

---

## 第四步：常见追问

**Q: `loading="lazy"` 原生属性够用了吗？**

原生 `loading="lazy"` 控制粒度粗，无法自定义提前加载距离、错误处理、占位图切换等。适合简单场景，复杂场景仍需手写。

**Q: 如何支持动态插入的图片？**

用 `MutationObserver` 监听 DOM 变化，对新插入的图片元素自动应用懒加载。

**Q: 何时调用 destroy？**

SPA 路由切换时旧页面的图片元素被移除；React `useEffect` cleanup / Vue `onUnmounted` 组件卸载时。

---

## 第五步：易错点

| 易错点 | 说明 |
|-------|------|
| 加载后不 unobserve | 每次回调都重复加载同一张图片，浪费带宽 |
| 加载失败不清 `data-src` | 下次回调再次尝试加载坏图，形成死循环 |
| 不清理 onload/onerror handler | 内存泄漏，尤其在 SPA 中 |
| 降级方案不做节流 | scroll 事件高频触发，影响性能 |
| rootMargin 单位遗漏 | 必须写成 `${rootMargin}px`，不能直接传数字 |
