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

> **进阶**：`rootMargin` 支持负值，如 `-50px` 表示缩小检测区域，图片需要更深入视口才触发加载。适用于需要图片完全可见才加载的场景。

| `threshold` | 回调触发时的目标可见比例 | `0.01`（1% 可见即触发） |

**回调函数接收 `entries` 数组**，每个 entry 包含：
- `entry.isIntersecting`：是否与根容器交叉（进入视口）
- `entry.target`：被观察的 DOM 元素
- `entry.intersectionRatio`：交叉比例（0~1）

调用 `observer.observe(element)` 开始监听，`observer.unobserve(element)` 停止监听单个元素，`observer.disconnect()` 停止所有监听。

---

## 第三步：懒加载实现的关键细节

### 3.1 HTML 约定

```html
<img class="lazy" data-src="real-image.jpg" src="placeholder.jpg">
```

- `src` 初始为占位图（保证布局不塌陷）
- `data-src` 存真实图片地址
- 进入视口时：`img.src = img.dataset.src`
- 加载完成/失败后：`img.removeAttribute('data-src')`（标记已处理）

### 3.2 为什么加载后要 unobserve？

每张图片只应加载一次。加载后继续监听是浪费资源。`observer.unobserve(entry.target)` 及时释放。

### 3.3 为什么加载后要移除 class？

```javascript
if (/^\.[a-zA-Z][\w-]*$/.test(selector)) {
  img.classList.remove(selector.slice(1));
}
```

加载完成后移除匹配的 class（如 `.lazy`），有两个好处：
1. **避免重复匹配**：如果后续重新查询 DOM，已加载的图片不会被再次选中
2. **样式解耦**：加载前可能有特殊样式（如模糊占位），加载后移除 class 可切换到正常样式

**注意**：这里用正则校验 selector 是否为简单的类选择器（如 `.lazy`），避免对复杂选择器（如 `.class1.class2`、`div.lazy`）做错误的类名操作。

### 3.4 错误处理防止死循环

```javascript
img.onerror = () => {
  img.src = placeholder;        // 回退到占位图
  img.removeAttribute('data-src'); // 移除 data-src，防止再次尝试
};
```

如果不清除 `data-src`，下次回调可能再次尝试加载同一张坏图，形成无限循环。

---

## 第四步：降级方案设计

当浏览器不支持 IntersectionObserver 时（如 IE、部分旧版 Android WebView），使用 **scroll + getBoundingClientRect + rAF 节流**：

```javascript
function onScroll() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(() => {
      checkImages();  // 在下一帧统一计算
      ticking = false;
    });
  }
}
```

**为什么用 rAF 而不是 setTimeout？**
- rAF 与浏览器刷新率同步（通常 60fps），不会过度触发
- 浏览器在页面不可见时会自动暂停 rAF，节省资源

**判断图片是否进入视口的公式：**
```
rect.top <= viewportHeight + rootMargin
```

即：图片顶部到视口顶部的距离 ≤ 视口高度 + 提前加载距离 → 图片已进入或即将进入。

---

## 第五步：资源释放与工程实践

### destroy 方法的设计

```javascript
return {
  destroy() {
    observer.disconnect(); // IO 方案：停止所有观察
    // 或
    window.removeEventListener('scroll', onScroll); // 降级方案：移除事件
  }
};
```

**何时调用 destroy？**
- SPA 路由切换时，旧页面的图片元素被移除，observer 已无意义
- `beforeunload` 事件中主动清理
- 组件卸载时（React `useEffect` cleanup / Vue `onUnmounted`）

### 工程扩展方向（加分项讨论）

| 扩展 | 说明 |
|------|------|
| `loading="lazy"` | 原生 HTML 属性，浏览器原生支持，但控制粒度粗 |
| `MutationObserver` | 监听 DOM 变化，自动对动态插入的图片应用懒加载 |
| 渐进式图片 | 先加载低质量缩略图（LQIP），再替换高清图 |
| `noscript` 降级 | 无 JS 时仍能显示图片 |

---

## 总结

```
视口检测 ──→ IntersectionObserver（优先）→ scroll + rAF（降级）
     │
加载触发 ──→ data-src → src，unobserve 已处理元素，移除 lazy class
     │
错误处理 ──→ onerror 回退占位图，移除 data-src 防死循环，清理 handler
     │
资源释放 ──→ disconnect / removeEventListener，提供 destroy 方法
```

**面试关键点：** 不仅要写出来，还要能讲清楚"为什么这么做"——为什么用 IO 而不是 scroll、为什么要 unobserve、为什么要防死循环。这些设计决策才是面试官真正想听到的。
