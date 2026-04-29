> 🟡 **优先级：P1（高频）** — 有明确大厂考察记录，建议刷

# 23 - IntersectionObserver 懒加载

## 基本信息

| 项目 | 内容 |
|------|------|
| 分类 | DOM 与浏览器 API |
| 难度 | ⭐⭐ |
| 考察点 | IntersectionObserver、图片懒加载、性能优化、兼容性降级 |

## 背景

在电商商品列表、瀑布流图片墙等场景中，页面可能包含几十甚至上百张图片。一次性全部加载会导致首屏白屏时间过长、带宽浪费、内存占用过高。图片懒加载是标准解决方案：**只在图片即将进入可视区域时才发起加载请求**。

## 题目要求

实现一个 `lazyLoad` 函数：

1. 使用 `IntersectionObserver` 监听目标图片，进入视口时将 `data-src` 赋给 `src`
2. 加载完成后移除 `data-src`，避免重复监听
3. 加载失败时显示 fallback 占位图
4. 返回 `destroy` 方法供外部主动销毁
5. 兼容无 IntersectionObserver 的浏览器：降级为 scroll + getBoundingClientRect + rAF 节流

### HTML 结构约定

```html
<img class="lazy" data-src="https://example.com/product-1.jpg" src="placeholder.jpg" alt="商品图">
```

### 函数签名

```javascript
function lazyLoad(selector = '.lazy', options = {})
// options.placeholder — 加载失败占位图 URL
// options.rootMargin — 提前加载距离(px)
// options.threshold — 交叉比例阈值
// 返回 { destroy: () => void }
```

## 示例

```javascript
const loader = lazyLoad('.lazy', { rootMargin: 200, threshold: 0.01 });
// 页面卸载时主动销毁
window.addEventListener('beforeunload', () => loader.destroy());
```

## 约束

- 纯原生 JavaScript，不使用第三方库
- 降级方案需要做 throttle（rAF 节流）防止 scroll 高频触发
- 图片加载失败需设置 fallback 并移除 `data-src`，防止重试死循环
