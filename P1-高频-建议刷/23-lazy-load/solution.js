function lazyLoad(selector = '.lazy', options = {}) {
  const {
    placeholder = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect fill="%23f0f0f0" width="200" height="150"/><text fill="%23999" font-size="14" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">加载失败</text></svg>',
    rootMargin = 200,
    threshold = 0.01,
  } = options;

  const images = Array.from(document.querySelectorAll(selector));

  if (images.length === 0) return { destroy() {} };

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

  let ticking = false;

  function checkImages() {
    const viewportHeight = window.innerHeight;
    const unprocessed = [];

    images.forEach((img) => {
      if (!img.dataset.src) return;

      const rect = img.getBoundingClientRect();
      if (rect.top <= viewportHeight + rootMargin) {
        loadImage(img);
      } else {
        unprocessed.push(img);
      }
    });

    images.length = 0;
    images.push(...unprocessed);

    if (images.length === 0) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        checkImages();
        ticking = false;
      });
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  checkImages();

  return {
    destroy() {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      images.length = 0;
    },
  };
}

module.exports = { lazyLoad };
