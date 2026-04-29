/**
 * 事件委托函数
 *
 * @param {Element}  parent    - 监听事件的父元素
 * @param {string}   selector  - CSS 选择器，匹配目标子元素
 * @param {string}   eventType - 事件类型（如 'click'）
 * @param {Function} handler   - 事件回调，this 指向匹配的子元素，e.target 为实际点击元素
 * @returns {Function} unbind  - 调用后移除该委托监听
 */
function delegate(parent, selector, eventType, handler) {
  // 核心：在 parent 上只绑定一个监听器，而非给每个子元素各绑一个
  // 这就是事件委托的本质——利用冒泡机制集中处理
  function listener(e) {
    // 从 e.target 开始向上遍历，找到最近的匹配 selector 的祖先元素
    // 这一步是关键：处理"点击了匹配元素的后代"的情况
    // 例如：<li><span>文本</span></li>，点击 span 时 e.target 是 span，
    // 但我们需要找到 li 才能匹配 'li' 选择器
    let target = e.target;

    // 从点击元素向上遍历到 parent 边界
    while (target && target !== parent) {
      if (target.matches(selector)) {
        // 找到匹配元素，调用 handler
        // 修正 this 指向：让 handler 中的 this 指向匹配的子元素
        handler.call(target, e);
        return;
      }
      target = target.parentElement;
    }

    // 如果 selector 匹配的是 parent 本身（如 delegate(div, 'div', ...)）
    if (parent.matches(selector)) {
      handler.call(parent, e);
    }
  }

  // 在 parent 上注册事件监听（冒泡阶段）
  // 第三个参数默认 false = 冒泡阶段捕获
  // 如需捕获阶段，可扩展支持 options 对象
  parent.addEventListener(eventType, listener);

  // 返回 unbind 函数，方便外部移除
  let bound = true;
  return function unbind() {
    if (!bound) return; // 防止重复 unbind
    bound = false;
    parent.removeEventListener(eventType, listener);
  };
}

// ==================== 使用示例 ====================

// const ul = document.getElementById('list');
//
// const unbind = delegate(ul, 'li', 'click', function(e) {
//   console.log('点击了:', e.target.textContent);
//   console.log('匹配元素:', this);       // this 是匹配 selector 的元素（向上遍历找到的），
                                          // 直接点击 li 时 this === e.target；点击 li 内部后代时两者不同
//   console.log('父元素:', e.currentTarget); // ul
// });
//
// // 动态添加的元素自动生效
// const li = document.createElement('li');
// li.textContent = '新项目';
// ul.appendChild(li);
// // 点击"新项目"也会触发 handler
//
// // 移除委托
// unbind();

module.exports = delegate;
