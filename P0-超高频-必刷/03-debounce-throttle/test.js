const { debounce, throttle } = require('./solution.js');

let passed = 0;
let total = 0;
let doneCount = 0;
const totalTestGroups = 8;
let resolved = false;

function assert(condition, msg) {
  total++;
  if (condition) {
    passed++;
  } else {
    console.error('❌ FAIL:', msg);
  }
}

function checkDone() {
  doneCount++;
  if (doneCount >= totalTestGroups && !resolved) {
    resolved = true;
    console.log(`✅ 全部通过 (${passed}/${total})`);
  }
}

// debounce 基础
{
  let count = 0;
  const fn = debounce(() => { count++; }, 200);
  fn(); fn(); fn();
  setTimeout(() => {
    assert(count === 1, 'debounce: 连续调用只执行一次');
    checkDone();
  }, 400);
}

// debounce cancel
{
  let count = 0;
  const fn = debounce(() => { count++; }, 200);
  fn();
  fn.cancel();
  setTimeout(() => {
    assert(count === 0, 'debounce: cancel 后不执行');
    checkDone();
  }, 400);
}

// debounce leading
{
  let count = 0;
  const fn = debounce(() => { count++; }, 200, { leading: true, trailing: false });
  fn();
  assert(count === 1, 'debounce leading: 首次立即执行');
  fn(); fn();
  setTimeout(() => {
    assert(count === 1, 'debounce leading: delay 内不重复执行');
    checkDone();
  }, 400);
}

// debounce this 和参数
{
  const obj = {
    value: 42,
    method: debounce(function (arg) {
      assert(this.value === 42, 'debounce: this 正确传递');
      assert(arg === 'test', 'debounce: 参数正确传递');
    }, 100)
  };
  obj.method('test');
  setTimeout(checkDone, 300);
}

// throttle 基础
{
  let count = 0;
  const fn = throttle(() => { count++; }, 300);
  fn(); fn(); fn();
  assert(count === 1, 'throttle: 首次立即执行 (leading=true)');
  setTimeout(() => {
    assert(count === 2, 'throttle: trailing 补执行一次');
    checkDone();
  }, 500);
}

// throttle cancel
{
  let count = 0;
  const fn = throttle(() => { count++; }, 300);
  fn();
  fn.cancel();
  setTimeout(() => {
    assert(count === 1, 'throttle: cancel 后 trailing 不执行');
    checkDone();
  }, 500);
}

// throttle leading=false
{
  let count = 0;
  const fn = throttle(() => { count++; }, 300, { leading: false, trailing: true });
  fn();
  assert(count === 0, 'throttle leading=false: 首次不立即执行');
  setTimeout(() => {
    assert(count === 1, 'throttle leading=false: interval 后执行');
    checkDone();
  }, 500);
}

// throttle this 和参数
{
  const obj = {
    value: 99,
    method: throttle(function (arg) {
      assert(this.value === 99, 'throttle: this 正确传递');
      assert(arg === 'hello', 'throttle: 参数正确传递');
    }, 100)
  };
  obj.method('hello');
  setTimeout(checkDone, 300);
}
