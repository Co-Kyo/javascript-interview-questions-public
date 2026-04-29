# 10 - 带重试的异步请求（指数退避）— 题解

## 四步讲解

---

### 第一步：理解问题本质

核心需求是把"执行 → 失败 → 等待 → 重试"这个循环封装成一个 Promise。

关键点：
- `fn()` 每次返回一个 Promise，成功 resolve，失败 reject
- 我们需要在 `reject` 时决定：还有重试次数吗？有 → 等一等再试；没有 → 把错误抛出去
- 这是一个**递归结构**：每次重试本质上是"再调用一次自己"

```
fn() → 失败 → 等待 → fn() → 失败 → 等待 → fn() → 成功 ✓
                          ↑ 递归
```

---

### 第二步：递归重试的核心模式

整个函数的核心是递归的 `attempt` 函数——它调用 `fn()`，失败时判断是否还有重试次数，有则等待后递归调用自身，无则抛出错误：

```js
// sleep 工具函数：将 setTimeout Promise 化以便 await（Transport 细节，非核心）
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function retryFetch(fn, { retries = 3, delay = 1000, backoff = 2, onRetry } = {}) {
  function attempt(currentAttempt) {
    return fn().catch((error) => {
      if (currentAttempt < retries) {
        // 1. 通知外部
        if (typeof onRetry === 'function') {
          onRetry(error, currentAttempt + 1);
        }
        // 2. 计算等待时间
        const waitTime = delay * Math.pow(backoff, currentAttempt);
        // 3. 等待 → 递归
        return sleep(waitTime).then(() => attempt(currentAttempt + 1));
      }
      // 4. 重试耗尽，抛出错误
      throw error;
    });
  }
  return attempt(0);
}
```

**执行流程图：**

```
attempt(0)
  └─ fn() ── reject ── onRetry(err, 1)
                          └─ sleep(1s)
                               └─ attempt(1)
                                    └─ fn() ── reject ── onRetry(err, 2)
                                                          └─ sleep(2s)
                                                               └─ attempt(2)
                                                                    └─ fn() ── resolve ✓
```

**注意 `return` 的作用**：每个 `.catch` 里都 `return` 了一个新 Promise，这样调用链才能正确串联。如果忘记 `return`，函数会返回 `undefined`。

---

### 第三步：指数退避的计算

退避公式：

```
waitTime = delay × backoff^attempt
```

| 重试轮次 | 公式 | 默认值 (delay=1000, backoff=2) |
|---|---|---|
| 第 1 次重试（attempt=0） | 1000 × 2⁰ | 1000ms |
| 第 2 次重试（attempt=1） | 1000 × 2¹ | 2000ms |
| 第 3 次重试（attempt=2） | 1000 × 2² | 4000ms |
| 第 4 次重试（attempt=3） | 1000 × 2³ | 8000ms |

> **注意**：`attempt` 从 0 开始计数，表示"已失败的次数"。第 1 次重试前等待 `delay × backoff⁰ = delay`。

**为什么用指数？** 因为服务端过载时，密集重试会加剧问题。指数增长让客户端"耐心等待"，给服务端恢复的时间。

---

### 第四步：边界情况与进阶

#### 边界处理

| 场景 | 处理方式 |
|---|---|
| `retries = 0` | 不重试，`fn()` 失败直接 throw |
| `fn()` 首次成功 | `.catch` 不触发，直接返回结果 |
| `onRetry` 未传 | 用 `typeof` 检查或可选链 `?.` 跳过 |
| `delay = 0` | 合法，立即重试（不等待） |

#### 进阶：随机抖动（Jitter）

纯指数退避有个问题：多个客户端同时失败时，它们的重试时间完全一致，造成「惊群效应」。

解决方案：在等待时间上加随机扰动：

```js
const jitter = baseWait * (0.5 + Math.random() * 0.5); // [0.5×baseWait, baseWait] 范围
setTimeout(resolve, jitter);
```

这让不同客户端的重试时间错开，降低同时冲击服务端的概率。

#### 进阶：可取消的重试

通过闭包 + 标志位实现取消，同时保存定时器 ID 以便取消时清除：

```js
let aborted = false;
let timerId = null;

// 在 setTimeout 调用时保存 ID
timerId = setTimeout(() => attempt(currentAttempt + 1), waitTime);

// abort 时同时清除定时器，避免无意义的回调触发
promise.abort = () => {
  aborted = true;
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
};
```

在每次 `fn()` 成功/失败后、每次 `setTimeout` 回调前检查 `aborted`，如果为 `true` 则 reject 一个 `AbortError`。同时 `clearTimeout` 确保已排队的定时器不会触发，避免资源浪费。

---

## 总结

本题考察三个核心能力的组合：

1. **递归思维**：将循环重试转化为递归的 `attempt(n)` 调用——这是整个函数的骨架
2. **指数退避建模**：理解 `delay × backoff^n` 公式的含义，用数学控制重试节奏
3. **Promise 链组装**：将回调风格的 `setTimeout` 包装为 Promise，使递归调用可以用 `await` 或 `.then()` 串联

这三个能力在实际开发中非常常见：轮询接口、WebSocket 重连、文件分片上传重试等场景都会用到相同的模式。
