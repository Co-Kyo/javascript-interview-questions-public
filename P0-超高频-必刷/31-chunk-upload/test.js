const { chunkUpload, generateFileId, sleep } = require('./solution.js');

// === Mock File 对象 ===
function createMockFile(name, size, lastModified = 1000) {
  return {
    name,
    size,
    lastModified,
    slice(start, end) {
      return { type: 'blob', start, end, size: end - start };
    },
  };
}

// === Mock fetch ===
let fetchCalls = [];

function mockFetch(url, options) {
  fetchCalls.push({ url, options });
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ url: 'https://cdn.test/file' }),
  });
}

global.fetch = mockFetch;
global.FormData = class FormData {
  constructor() { this.data = {}; }
  append(k, v) { this.data[k] = v; }
};
global.DOMException = class DOMException extends Error {
  constructor(msg, name) { super(msg); this.name = name; }
};

// === 测试 ===

async function runTests() {
  // --- 基本功能：3MB 文件，3 个分片 ---
  fetchCalls = [];

  const file = createMockFile('test.txt', 1024 * 1024 * 3);

  const progressValues = [];
  let completedResult = null;

  chunkUpload(file, {
    chunkSize: 1024 * 1024,
    concurrency: 2,
    maxRetries: 1,
    onProgress(p) { progressValues.push(p); },
    onComplete(r) { completedResult = r; },
    onError(e) { console.error('ERROR:', e.message); },
  });

  await sleep(200);

  console.assert(progressValues.length === 3, '基本功能: 应有 3 次进度回调');
  console.assert(progressValues[progressValues.length - 1] === 100, '基本功能: 最终进度 100%');
  console.assert(completedResult !== null, '基本功能: onComplete 应被调用');
  console.assert(fetchCalls.length === 4, '基本功能: 3 次上传 + 1 次合并');

  // --- 空文件 ---
  fetchCalls = [];
  let emptyResult = null;

  chunkUpload(createMockFile('empty.txt', 0), {
    onComplete(r) { emptyResult = r; },
  });

  await sleep(50);
  console.assert(emptyResult !== null, '空文件: 直接调用 onComplete');
  console.assert(fetchCalls.length === 0, '空文件: 不发起任何请求');

  // --- 参数校验 ---
  try {
    chunkUpload(null);
    console.assert(false, '参数校验: null file 应抛 TypeError');
  } catch (e) {
    console.assert(e instanceof TypeError, '参数校验: null file 抛 TypeError');
  }

  try {
    chunkUpload({ size: 100, slice: () => {} }, { chunkSize: 0 });
    console.assert(false, '参数校验: chunkSize=0 应抛 RangeError');
  } catch (e) {
    console.assert(e instanceof RangeError, '参数校验: chunkSize=0 抛 RangeError');
  }

  try {
    chunkUpload({ size: 100, slice: () => {} }, { concurrency: 0 });
    console.assert(false, '参数校验: concurrency=0 应抛 RangeError');
  } catch (e) {
    console.assert(e instanceof RangeError, '参数校验: concurrency=0 抛 RangeError');
  }

  // --- generateFileId ---
  const id1 = generateFileId(createMockFile('a.txt', 100, 1));
  const id2 = generateFileId(createMockFile('a.txt', 100, 2));
  const id3 = generateFileId(createMockFile('a.txt', 200, 1));
  console.assert(id1 !== id2, 'generateFileId: 不同 lastModified 生成不同 id');
  console.assert(id1 !== id3, 'generateFileId: 不同 size 生成不同 id');

  // --- AbortController 返回 ---
  const controller = chunkUpload(createMockFile('x.txt', 500), {});
  console.assert(typeof controller.abort === 'function', '返回值: 应返回 AbortController');

  // 等待 AbortController 测试的上传完成，避免干扰后续测试
  await sleep(200);

  // --- 单分片文件 ---
  fetchCalls = [];
  let smallCompleted = false;

  chunkUpload(createMockFile('small.txt', 500), {
    onComplete() { smallCompleted = true; },
  });

  await sleep(500);
  console.assert(smallCompleted, '单分片: onComplete 应被调用');
  console.assert(fetchCalls.length === 2, '单分片: 1 次上传 + 1 次合并');

  console.log('✅ 全部通过');
}

runTests().catch(e => {
  console.error('测试异常:', e);
  process.exit(1);
});
