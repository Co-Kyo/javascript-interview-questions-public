# 分片上传 - 五步讲解

## 第一步：分片切割 — File.slice()

### 核心 API

```javascript
const chunk = file.slice(start, end);
```

`File.slice()` 是分片上传的基础。它返回文件指定区间的 `Blob` 对象，**不会将整个文件读入内存**，对大文件非常友好。

### 切割逻辑

```
文件大小: 100MB
分片大小: 1MB (1024 * 1024 字节)
分片数量: Math.ceil(100MB / 1MB) = 100 片

分片 0: file.slice(0,           1048576)
分片 1: file.slice(1048576,     2097152)
分片 2: file.slice(2097152,     3145728)
...
分片 99: file.slice(103809024,  104857600)
```

最后一个分片通常不足 `chunkSize`，需要用 `Math.min(start + chunkSize, file.size)` 截断。`slice()` 是零拷贝操作，性能开销极小，切割出的 Blob 可直接放入 `FormData` 上传。

---

## 第二步：并发控制 — 任务队列模型

### 为什么不能用 Promise.all？

```javascript
await Promise.all(chunks.map(chunk => upload(chunk)));
```

> ⚠️ 100 个分片同时发起 100 个请求


浏览器会限制同域名并发连接数（通常 6 个），导致大量请求排队，且无法精确控制并发。

### 正确做法：并发池（Concurrency Pool）

```
并发数 = 3，共 100 个分片

时间轴：
t0: [上传0] [上传1] [上传2]          ← 立即启动 3 个
t1: [上传0完成] → [上传3]            ← 完成一个，调度下一个
t2: [上传1完成] → [上传4]
t3: [上传2完成] → [上传5]
...始终保持最多 3 个在执行
```

### 核心实现

```javascript
const executing = new Set();

while (nextIndex < total || executing.size > 0) {
  while (nextIndex < total && executing.size < concurrency) {
    const p = uploadChunk(nextIndex++).then(() => executing.delete(p));
    executing.add(p);
  }
  await Promise.race(executing);
}
```

外层循环持续调度，内层循环在并发未满时填满任务。`Promise.race(executing)` 等待任意一个完成后，循环回到内层检查是否可以调度新任务。这个模式叫 **并发池 / 任务队列**，是前端并发控制的标准方案。

---

## 第三步：进度回调 — 等比计算

```javascript
uploadedCount++;
const percentage = (uploadedCount / totalChunks) * 100;
onProgress(percentage);
```

每个分片上传成功后，`uploadedCount` 加一，按分片数等比计算进度百分比。如果需要字节级别的更精细进度，可以使用 `XMLHttpRequest` 的 `upload.onprogress` 事件替代 `fetch`。

---

## 第四步：失败重试 — 指数退避

### 退避策略

```
第 1 次重试: 等待 1s   (2^0 * 1000)
第 2 次重试: 等待 2s   (2^1 * 1000)
第 3 次重试: 等待 4s   (2^2 * 1000)
...上限通常设为 10s
```

### 实现要点

```javascript
async function uploadChunk(index) {
  let retries = 0;
  while (retries <= maxRetries) {
    try {
      await doUpload(index);
      return;
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      retries++;
      if (retries > maxRetries) throw error;
      const delay = Math.min(1000 * Math.pow(2, retries - 1), 10000);
      await sleep(delay);
    }
  }
}
```

`AbortError`（用户取消）直接抛出不重试。4xx 客户端错误（除 429 限流外）也不值得重试。网络错误（`TypeError`）和 5xx 服务器错误才进入重试逻辑。

---

## 第五步：取消上传 — AbortController

```javascript
const controller = new AbortController();
const { signal } = controller;

fetch('/upload', { signal });
controller.abort();
```

调用 `controller.abort()` 后，所有使用该 `signal` 的 `fetch` 请求都会被中断。

在 `scheduler` 的循环中检查 `signal.aborted`，在 `fetch` 请求中传入 `signal`，将 `AbortController` 返回给调用方支持外部取消。用户取消后，所有进行中的请求被中断，同时调用 `onError`（如果是非主动取消的错误）。

---

## 复杂度分析

| 维度 | 复杂度 | 说明 |
|------|--------|------|
| 时间 | O(n) | n = 分片数，每个分片最多处理 (maxRetries+1) 次 |
| 空间 | O(n) | executing Set（最多 concurrency 个） |
| 网络 | O(n) | n 次上传请求 + 1 次合并请求 |

## 面试评分维度

| 维度 | 权重 | 考察内容 |
|------|------|----------|
| 分片切割 | 20% | `File.slice()` 的正确使用，边界处理 |
| 并发控制 | 30% | 并发池模型，`Promise.race` 调度 |
| 进度回调 | 15% | 进度计算逻辑，回调时机 |
| 失败重试 | 20% | 指数退避，重试次数限制 |
| 取消支持 | 15% | `AbortController` 的集成 |

## 常见面试追问

- **如何判断哪些错误值得重试？** 网络错误（`TypeError`）、5xx 服务器错误、429 限流值得重试；4xx 客户端错误（如 401、403）通常不值得重试。
- **如何实现断点续传？** 上传前先向服务端查询已上传的分片列表，跳过已上传的分片。前端可用 `localStorage` 或 `IndexedDB` 记录上传状态。
- **进度回调频率过高怎么办？** 如果分片很多（如 10000 片），需要节流 `onProgress`。
