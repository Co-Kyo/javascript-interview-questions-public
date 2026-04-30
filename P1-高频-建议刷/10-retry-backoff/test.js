const { retryFetch } = require('./solution.js');

(async () => {
  const result1 = await retryFetch(() => Promise.resolve('ok'), { retries: 3, delay: 10, backoff: 1 });
  console.assert(result1 === 'ok', 'first success returns immediately');

  let count2 = 0;
  const result2 = await retryFetch(() => {
    count2++;
    if (count2 < 3) return Promise.reject(new Error('fail'));
    return Promise.resolve('success');
  }, { retries: 3, delay: 10, backoff: 1 });
  console.assert(result2 === 'success', 'succeeds on 3rd attempt');
  console.assert(count2 === 3, 'called 3 times total');

  let count3 = 0;
  try {
    await retryFetch(() => { count3++; return Promise.reject(new Error('always fail')); },
      { retries: 2, delay: 10, backoff: 1 });
    console.assert(false, 'should throw');
  } catch (e) {
    console.assert(e.message === 'always fail', 'throws last error after retries exhausted');
    console.assert(count3 === 3, 'retries=2 means 3 total calls');
  }

  const retryCalls = [];
  let count4 = 0;
  await retryFetch(() => {
    count4++;
    if (count4 < 3) return Promise.reject(new Error('e'));
    return Promise.resolve('ok');
  }, { retries: 3, delay: 10, backoff: 1, onRetry: (err, attempt) => retryCalls.push(attempt) });
  console.assert(JSON.stringify(retryCalls) === '[1,2]', 'onRetry called on attempts 1 and 2');

  let count5 = 0;
  try {
    await retryFetch(() => { count5++; return Promise.reject(new Error('x')); },
      { retries: 0, delay: 10, backoff: 1 });
  } catch (e) {
    console.assert(count5 === 1, 'retries=0 calls fn only once');
  }

  try {
    retryFetch('not a function');
    console.assert(false, 'should throw TypeError');
  } catch (e) {
    console.assert(e instanceof TypeError, 'non-function fn throws TypeError');
  }

  console.log('✅ 10-retry-backoff 全部通过');
})().catch(e => { console.error(e); process.exit(1); });
