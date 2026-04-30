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

```javascript
function retryFetch(fn, { retries = 3, delay = 1000, backoff = 2, onRetry } = {}) {
  if (typeof fn !== 'function') {
    throw new TypeError('fn must be a function');
  }
  if (delay <= 0 || backoff <= 0) {
    throw new RangeError('delay and backoff must be positive numbers');
  }

  function attempt(currentAttempt) {
    return fn().catch((error) => {
      if (currentAttempt < retries) {
        if (typeof onRetry === 'function') {
          onRetry(error, currentAttempt + 1);
        }
        const waitTime = delay * Math.pow(backoff, currentAttempt);
        return new Promise((resolve) => {
          setTimeout(resolve, waitTime);
        }).then(() => attempt(currentAttempt + 1));
      }
      throw error;
    });
  }
  return attempt(0);
}
```

**参数校验**：`fn` 必须是函数，`delay` 和 `backoff` 必须为正数——提前 throw 避免后续出现难以追踪的错误。

`return` 是关键——每个 `.catch` 里都 `return` 了一个新 Promise，这样调用链才能正确串联。如果忘记 `return`，函数会返回 `undefined`。

执行流程：

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

`attempt` 从 0 开始计数，表示"已失败的次数"。第 1 次重试前等待 `delay × backoff⁰ = delay`。

**为什么用指数？** 因为服务端过载时，密集重试会加剧问题。指数增长让客户端"耐心等待"，给服务端恢复的时间。

---

### 第四步：边界情况与进阶

#### 边界处理

| 场景 | 处理方式 |
|---|---|
| `retries = 0` | 不重试，`fn()` 失败直接 throw |
| `fn()` 首次成功 | `.catch` 不触发，直接返回结果 |
| `onRetry` 未传 | 用 `typeof` 检查跳过 |
| `delay = 0` | 合法，立即重试（不等待） |

#### 进阶：随机抖动（Jitter）

口头讨论方向——纯指数退避有个问题：多个客户端同时失败时，它们的重试时间完全一致，造成「惊群效应」。解决方案是在等待时间上加随机扰动，如 `baseWait * (0.5 + Math.random() * 0.5)`，让不同客户端的重试时间错开，降低同时冲击服务端的概率。

#### 进阶：可取消的重试

口头讨论方向——通过闭包 + 标志位实现取消，同时保存定时器 ID 以便取消时清除。在每次 `fn()` 成功/失败后、每次 `setTimeout` 回调前检查 `aborted` 标志，`clearTimeout` 确保已排队的定时器不会触发。

---

## 总结

本题考察三个核心能力的组合：

1. **递归思维**：将循环重试转化为递归的 `attempt(n)` 调用
2. **指数退避建模**：理解 `delay × backoff^n` 公式的含义，用数学控制重试节奏
3. **Promise 链组装**：将回调风格的 `setTimeout` 包装为 Promise，使递归调用可以用 `.then()` 串联

这三个能力在实际开发中非常常见：轮询接口、WebSocket 重连、文件分片上传重试等场景都会用到相同的模式。
