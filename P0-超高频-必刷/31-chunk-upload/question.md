> 🔴 **优先级：P0（超高频）** — 多公司多次出现，必刷题

# 31 - 分片上传（带进度）

## 基本信息

- **分类**：工程实用场景
- **难度**：⭐⭐⭐
- **考察点**：`File.slice`、并发控制、进度回调、断点续传

---

## 背景

在实际业务中，大文件上传（如网盘、视频平台、云存储等）是一个常见需求。直接上传完整大文件会面临以下问题：

- 网络波动导致上传失败，需要重新上传整个文件
- 浏览器内存占用过高
- 无法精确展示上传进度
- 服务端对请求体大小有限制

因此需要实现**分片上传**方案：将大文件切割为多个小分片，并发上传，实时汇报进度，并支持失败重试。

---

## 题目要求

请实现 `chunkUpload(file, options)` 函数，支持以下能力：

### 1. 分片切割
- 使用 `File.slice()` 将文件切割为指定大小的分片
- 默认分片大小为 1MB（1024 * 1024 字节）

### 2. 并发控制
- 支持配置最大并发数（默认 3）
- 同一时刻上传的分片数不超过 `concurrency` 限制
- 某个分片完成后自动调度下一个待上传分片

### 3. 进度回调
- 提供 `onProgress(percentage)` 回调，参数为 0~100 的进度百分比
- 每个分片上传完成后更新进度

### 4. 失败重试
- 单个分片上传失败时，支持自动重试
- 可配置最大重试次数（默认 3 次）
- 重试次数耗尽后，整体上传失败

### 5. 完成回调
- 所有分片上传成功后，调用服务端合并接口
- 调用 `onComplete(result)` 回调通知上传完成

---

## 函数签名

```javascript
/**
 * @param {File} file - 要上传的文件对象
 * @param {Object} options - 配置项
 * @param {number} [options.chunkSize=1024*1024] - 分片大小（字节），默认 1MB
 * @param {number} [options.concurrency=3] - 最大并发数
 * @param {number} [options.maxRetries=3] - 单分片最大重试次数
 * @param {Function} [options.onProgress] - 进度回调，参数为百分比（0~100）
 * @param {Function} [options.onComplete] - 上传完成回调
 * @param {Function} [options.onError] - 上传失败回调
 * @returns {AbortController} - 返回控制器，支持取消上传
 */
function chunkUpload(file, options = {}) { ... }
```

---

## 示例用法

```javascript
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0]; // 假设选择了一个 100MB 的文件

const controller = chunkUpload(file, {
  chunkSize: 1024 * 1024,       // 每片 1MB，共 100 个分片
  concurrency: 3,               // 最多 3 个并发
  maxRetries: 3,                // 每片最多重试 3 次
  onProgress(percentage) {
    console.log(`上传进度: ${percentage.toFixed(1)}%`);
    // 输出示例: 上传进度: 32.0%
  },
  onComplete(result) {
    console.log('上传完成:', result);
    // 输出示例: 上传完成: { url: 'https://cdn.example.com/xxx.mp4' }
  },
  onError(error) {
    console.error('上传失败:', error.message);
  }
});

// 支持取消上传
// controller.abort();
```

---

## 约束条件

1. 使用 `File.slice()` 进行分片切割
2. 使用 `FormData` 模拟上传请求（实际上传到 `/upload` 接口）
3. 每个分片请求需携带：分片序号、总分片数、文件唯一标识（如文件名+大小的 hash）
4. 并发控制不能使用 `Promise.all` 一次性发起所有请求
5. 重试时需有指数退避（exponential backoff）
6. 支持通过 `AbortController` 取消上传
7. 不依赖第三方库，纯原生 JavaScript 实现

---

## 边界条件

| 场景 | 预期行为 |
|------|----------|
| 空文件（size = 0） | 直接调用 onComplete，不发起请求 |
| 文件大小恰好整除 chunkSize | 正常切割，最后一个分片无截断 |
| chunkSize > file.size | 只产生 1 个分片 |
| concurrency >= totalChunks | 所有分片同时上传 |
| 所有请求均 4xx 失败 | 不重试，直接触发 onError |
| 上传中途调用 abort() | 终止所有进行中的请求 |

---

## 加分项（可选实现）

- [ ] 支持断点续传：记录已上传分片，刷新页面后可继续上传
- [ ] 支持计算文件 hash（如 MD5/SHA-256）作为文件唯一标识
- [ ] 支持暂停 / 恢复上传
- [ ] 支持 Web Worker 计算文件 hash，避免阻塞主线程
