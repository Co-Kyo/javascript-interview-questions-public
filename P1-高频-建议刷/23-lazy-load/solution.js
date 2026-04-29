/**
 * 图片懒加载 - IntersectionObserver + 降级方案
 * @param {string} selector - 懒加载图片的 CSS 选择器（如 '.lazy'、'.lazy-img'）
 * @param {object} options - 配置项
 * @param {string} options.placeholder - 加载失败占位图（需为合法的图片 URL 或 data URI）
 * @param {number} options.rootMargin - 提前加载距离(px)，正数提前触发，负数延迟触发
 * @param {number} options.threshold - 交叉比例阈值（0~1）
 * @returns {{ destroy: () => void }}
 */
function lazyLoad(selector = '.lazy', options = {}) {
  const {
    placeholder = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect fill="%23f0f0f0" width="200" height="150"/><text fill="%23999" font-size="14" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">加载失败</text></svg>', // 默认占位图（可替换）
    rootMargin = 200,
    threshold = 0.01,
  } = options;

  // 收集所有需要懒加载的图片
  const images = Array.from(document.querySelectorAll(selector));

  if (images.length === 0) return { destroy() {} };

  // ---- 核心：加载单张图片 ----
  function loadImage(img) {
    const src = img.dataset.src;
    if (!src) return; // 没有 data-src 或已处理过，跳过

    // 设置真实地址，触发浏览器加载
    img.src = src;

    // 加载成功：清理 data-src，标记为已处理
    img.onload = () => {
      img.removeAttribute('data-src');
      img.onload = null; // 清理处理器，防止内存泄漏
      // 如果 selector 是简单类选择器（如 '.lazy'），移除该类避免重复匹配
      if (/^\.[a-zA-Z][\w-]*$/.test(selector)) {
        img.classList.remove(selector.slice(1));
      }
    };

    // 加载失败：显示 fallback 占位图，同样移除 data-src 防止重试
    img.onerror = () => {
      img.src = placeholder;
      img.removeAttribute('data-src');
      img.onerror = null; // 清理处理器，防止内存泄漏
    };
  }

  // ---- 方案 A：使用 IntersectionObserver ----
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // isIntersecting 为 true 表示元素进入（或即将进入）视口
          if (entry.isIntersecting) {
            loadImage(entry.target);
            // 加载后停止监听该元素，释放资源
            observer.unobserve(entry.target);
          }
        });
      },
      {
        root: null,          // 默认使用视口
        rootMargin: `${rootMargin}px`,  // 提前 N px 开始触发
        threshold,           // 元素可见比例达到阈值时触发
      }
    );

    // 观察每张图片
    images.forEach((img) => observer.observe(img));

    // 返回销毁方法
    return {
      destroy() {
        observer.disconnect();  // 停止所有观察
        images.length = 0;      // 释放图片引用
      },
    };
  }

  // ---- 方案 B：降级方案 - scroll + getBoundingClientRect + throttle ----
  let ticking = false; // requestAnimationFrame 节流标志

  function checkImages() {
    const viewportHeight = window.innerHeight;
    const unprocessed = [];

    images.forEach((img) => {
      // 已处理过的跳过（没有 data-src 说明已加载或已失败）
      if (!img.dataset.src) return;

      const rect = img.getBoundingClientRect();
      // 元素顶部距离视口顶部 < 视口高度 + 提前量 → 进入可视区域
      if (rect.top <= viewportHeight + rootMargin) {
        loadImage(img);
      } else {
        unprocessed.push(img);
      }
    });

    // 更新列表：只保留未处理的
    images.length = 0;
    images.push(...unprocessed);

    // 全部加载完毕，自动清理监听
    if (images.length === 0) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    }
  }

  // 使用 rAF 做节流，避免 scroll 高频触发
  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        checkImages();
        ticking = false;
      });
    }
  }

  // 绑定事件并立即检查一次（处理首屏图片）
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  checkImages(); // 首屏检查

  // 返回销毁方法
  return {
    destroy() {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      images.length = 0; // 释放图片引用
    },
  };
}
