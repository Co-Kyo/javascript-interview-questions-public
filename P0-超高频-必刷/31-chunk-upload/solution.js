/**
 * 分片上传（带进度、并发控制、失败重试）
 *
 * @param {File} file - 要上传的文件对象
 * @param {Object} options - 配置项
 * @param {number} [options.chunkSize=1024*1024] - 分片大小（字节）
 * @param {number} [options.concurrency=3] - 最大并发数
 * @param {number} [options.maxRetries=3] - 单分片最大重试次数
 * @param {Function} [options.onProgress] - 进度回调 (0~100)
 * @param {Function} [options.onComplete] - 完成回调
 * @param {Function} [options.onError] - 失败回调
 * @returns {AbortController} - 可用于取消上传
 */
function chunkUpload(file, options = {}) {
  // ── 0. 参数校验 ──────────────────────────────────────────────
  if (!file || typeof file.size !== 'number' || typeof file.slice !== 'function') {
    throw new TypeError('chunkUpload: file must be a File or Blob object');
  }

  const {
    chunkSize = 1024 * 1024,   // 默认 1MB 每片
    concurrency = 3,            // 默认最大 3 并发
    maxRetries = 3,             // 默认每片最多重试 3 次
    onProgress = () => {},
    onComplete = () => {},
    onError = () => {},
  } = options;

  if (chunkSize <= 0) throw new RangeError('chunkSize must be > 0');
  if (concurrency < 1) throw new RangeError('concurrency must be >= 1');
  if (maxRetries < 0) throw new RangeError('maxRetries must be >= 0');

  // ── 1. 分片切割 ──────────────────────────────────────────────
  // 核心 API：File.slice(start, end) 返回 Blob，不会读入内存
  const totalChunks = Math.ceil(file.size / chunkSize);

  // 空文件特殊处理
  if (totalChunks === 0) {
    onComplete({ url: null, message: 'Empty file, nothing to upload' });
    return new AbortController();
  }

  const fileId = generateFileId(file); // 生成文件唯一标识

  let uploadedCount = 0; // 已成功上传的分片数

  // ── 2. 并发控制：任务队列 ─────────────────────────────────────
  // 核心思想：维护一个"执行中"计数器，完成一个立即调度下一个
  const abortController = new AbortController();
  const { signal } = abortController;

  let nextChunkIndex = 0; // 下一个待调度的分片索引

  /**
   * 判断错误是否值得重试
   * 4xx 客户端错误（除 429 限流外）不应重试
   */
  function isRetryableError(error) {
    // 网络错误（TypeError）始终可重试
    if (error instanceof TypeError) return true;
    // AbortError 不重试（用户主动取消）
    if (error.name === 'AbortError') return false;
    // HTTP 4xx 错误（除 429）不重试
    const statusMatch = error.message.match(/HTTP (\d+)/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);
      if (status >= 400 && status < 500 && status !== 429) return false;
    }
    return true;
  }

  /**
   * 上传单个分片（含重试逻辑）
   * @param {number} index - 分片索引
   * @returns {Promise<void>}
   */
  async function uploadChunk(index) {
    let retries = 0;

    while (retries <= maxRetries) {
      // 检查是否已被取消
      if (signal.aborted) {
        throw new DOMException('Upload aborted', 'AbortError');
      }

      try {
        // 切割分片：File.slice(start, end)
        const start = index * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        // 构造 FormData，携带分片元信息
        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('chunkIndex', index);
        formData.append('totalChunks', totalChunks);
        formData.append('fileId', fileId);
        formData.append('fileName', file.name);

        // 发送上传请求（实际场景替换为真实接口）
        const response = await fetch('/upload', {
          method: 'POST',
          body: formData,
          signal, // 传入 AbortSignal，支持取消
        });

        if (!response.ok) {
          throw new Error(`Chunk ${index} upload failed: HTTP ${response.status}`);
        }

        // ── 3. 进度更新 ──────────────────────────────────────
        // 每个分片完成时，按分片数等比更新进度
        uploadedCount++;
        const percentage = (uploadedCount / totalChunks) * 100;
        onProgress(percentage);

        return; // 成功，退出重试循环
      } catch (error) {
        // 如果是用户主动取消，直接抛出，不重试
        if (error.name === 'AbortError') {
          throw error;
        }

        // 判断是否值得重试
        if (!isRetryableError(error)) {
          throw error; // 不可重试的错误，直接抛出
        }

        retries++;

        // ── 4. 指数退避重试 ──────────────────────────────────
        // 重试间隔：1s, 2s, 4s, ... (2^(retries-1) * 1000ms)
        if (retries <= maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retries - 1), 10000);
          await sleep(delay);
          console.warn(`Chunk ${index} failed, retrying (${retries}/${maxRetries})...`);
        } else {
          // 重试次数耗尽，抛出错误
          throw new Error(
            `Chunk ${index} failed after ${maxRetries} retries: ${error.message}`
          );
        }
      }
    }
  }

  /**
   * 调度器：维持最多 concurrency 个并发任务
   * 核心并发控制逻辑：
   *   1. 启动时立即发起 min(concurrency, totalChunks) 个任务
   *   2. 每个任务完成后，自动从队列取下一个
   *   3. 直到所有分片都已调度且完成
   */
  async function scheduler() {
    const executing = new Set(); // 当前执行中的 Promise 集合

    while (nextChunkIndex < totalChunks || executing.size > 0) {
      // 当还有待调度分片 且 并发未满时，发起新任务
      while (nextChunkIndex < totalChunks && executing.size < concurrency) {
        const index = nextChunkIndex++;
        const promise = uploadChunk(index)
          .then(() => {
            executing.delete(promise); // 完成后移除
          })
          .catch((error) => {
            executing.delete(promise);
            throw error; // 向上传播错误
          });
        executing.add(promise);
      }

      // 等待任意一个完成（Promise.race），腾出并发位
      if (executing.size > 0) {
        await Promise.race(executing);
      }
    }
  }

  // ── 5. 启动上传 ──────────────────────────────────────────────
  scheduler()
    .then(() => {
      // 所有分片上传完成，调用合并接口
      return fetch('/upload/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, fileName: file.name, totalChunks }),
        signal,
      });
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Merge failed: HTTP ${response.status}`);
      }
      return response.json();
    })
    .then((result) => {
      onComplete(result);
    })
    .catch((error) => {
      // 失败时取消所有进行中的请求，防止 zombie promises
      if (!signal.aborted) {
        abortController.abort();
      }
      if (error.name !== 'AbortError') {
        onError(error);
      }
    });

  return abortController;
}

// ── 工具函数 ────────────────────────────────────────────────────

/**
 * 生成文件唯一标识
 * 实际项目中建议用 SparkMD5 计算文件内容 hash
 * 这里简化为 文件名+大小+最后修改时间 的组合
 */
function generateFileId(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/**
 * 延迟函数，用于重试的指数退避
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── 导出（兼容模块化和直接引用）──────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { chunkUpload };
}
