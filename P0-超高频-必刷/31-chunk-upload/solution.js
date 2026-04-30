function chunkUpload(file, options = {}) {
  const {
    chunkSize = 1024 * 1024,
    concurrency = 3,
    maxRetries = 3,
    onProgress = () => {},
    onComplete = () => {},
    onError = () => {},
  } = options;

  const totalChunks = Math.ceil(file.size / chunkSize);

  if (totalChunks === 0) {
    onComplete({ url: null, message: 'Empty file, nothing to upload' });
    return new AbortController();
  }

  const fileId = generateFileId(file);

  let uploadedCount = 0;

  const abortController = new AbortController();
  const { signal } = abortController;

  let nextChunkIndex = 0;

  function isRetryableError(error) {
    if (error instanceof TypeError) return true;
    if (error.name === 'AbortError') return false;
    const statusMatch = error.message.match(/HTTP (\d+)/);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);
      if (status >= 400 && status < 500 && status !== 429) return false;
    }
    return true;
  }

  async function uploadChunk(index) {
    let retries = 0;

    while (retries <= maxRetries) {
      if (signal.aborted) {
        throw new DOMException('Upload aborted', 'AbortError');
      }

      try {
        const start = index * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('chunkIndex', index);
        formData.append('totalChunks', totalChunks);
        formData.append('fileId', fileId);
        formData.append('fileName', file.name);

        const response = await fetch('/upload', {
          method: 'POST',
          body: formData,
          signal,
        });

        if (!response.ok) {
          throw new Error(`Chunk ${index} upload failed: HTTP ${response.status}`);
        }

        uploadedCount++;
        const percentage = (uploadedCount / totalChunks) * 100;
        onProgress(percentage);

        return;
      } catch (error) {
        if (error.name === 'AbortError') {
          throw error;
        }

        if (!isRetryableError(error)) {
          throw error;
        }

        retries++;

        if (retries <= maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retries - 1), 10000);
          await sleep(delay);
          console.warn(`Chunk ${index} failed, retrying (${retries}/${maxRetries})...`);
        } else {
          throw new Error(
            `Chunk ${index} failed after ${maxRetries} retries: ${error.message}`
          );
        }
      }
    }
  }

  async function scheduler() {
    const executing = new Set();

    while (nextChunkIndex < totalChunks || executing.size > 0) {
      while (nextChunkIndex < totalChunks && executing.size < concurrency) {
        const index = nextChunkIndex++;
        const promise = uploadChunk(index)
          .then(() => {
            executing.delete(promise);
          })
          .catch((error) => {
            executing.delete(promise);
            throw error;
          });
        executing.add(promise);
      }

      if (executing.size > 0) {
        await Promise.race(executing);
      }
    }
  }

  scheduler()
    .then(() => {
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
      if (!signal.aborted) {
        abortController.abort();
      }
      if (error.name !== 'AbortError') {
        onError(error);
      }
    });

  return abortController;
}

function generateFileId(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { chunkUpload, generateFileId, sleep };
}
