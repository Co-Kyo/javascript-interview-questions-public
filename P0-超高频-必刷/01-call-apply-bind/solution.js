/**
 * 手写 call / apply / bind
 * 核心思路：将函数临时挂载到目标对象上，通过对象方法调用隐式绑定 this，再清理痕迹
 */

// ==================== myCall ====================
Function.prototype.myCall = function (thisArg, ...args) {
  // null/undefined → globalThis，原始值 → 包装对象
  thisArg = thisArg == null ? globalThis : Object(thisArg);

  // 用 Symbol 避免属性污染
  const fnKey = Symbol('fn');
  thisArg[fnKey] = this; // this 就是调用 myCall 的那个函数

  // 执行函数（隐式绑定 this 为 thisArg）
  const result = thisArg[fnKey](...args);

  // 清理临时属性
  delete thisArg[fnKey];

  return result;
};

// ==================== myApply ====================
Function.prototype.myApply = function (thisArg, argsArray) {
  thisArg = thisArg == null ? globalThis : Object(thisArg);

  // 类型校验：argsArray 必须是数组、null 或 undefined
  if (argsArray != null && !Array.isArray(argsArray)) {
    throw new TypeError('myApply: second argument must be an array or null/undefined');
  }

  const fnKey = Symbol('fn');
  thisArg[fnKey] = this;

  // 与 myCall 唯一区别：参数从数组展开，无参数则不传
  const result = argsArray ? thisArg[fnKey](...argsArray) : thisArg[fnKey]();

  delete thisArg[fnKey];

  return result;
};

// ==================== myBind ====================
Function.prototype.myBind = function (thisArg, ...presetArgs) {
  const originalFn = this;

  const bound = function (...laterArgs) {
    // 关键：判断是否通过 new 调用
    // 如果 this 是 bound 的实例 → new 调用 → this 绑定应被忽略，用 this 即可
    // 否则 → 普通调用 → 使用绑定的 thisArg
    const context = this instanceof bound ? this : thisArg;

    // 不使用原生 apply，改用临时属性挂载方式（与 myCall/myApply 一致）
    const fnKey = Symbol('fn');
    context[fnKey] = originalFn;
    const result = context[fnKey](...presetArgs, ...laterArgs);
    delete context[fnKey];
    return result;
  };

  // 维护原型链：new 调用时 instance instanceof originalFn 为 true
  if (originalFn.prototype) {
    bound.prototype = Object.create(originalFn.prototype);
  }

  // 维护函数名：myBind 返回的函数 name 应为 "bound <原函数名>"
  Object.defineProperty(bound, 'name', {
    value: `bound ${originalFn.name || ''}`.trim(),
    configurable: true,
  });

  return bound;
};

// ==================== 测试 ====================
if (require.main === module) {
  // 测试 1：myCall / myApply
  function greet(greeting, punctuation) {
    return `${greeting}, ${this.name}${punctuation}`;
  }
  const person = { name: 'Alice' };

  console.log('--- myCall ---');
  console.log(greet.myCall(person, 'Hello', '!'));  // Hello, Alice!

  console.log('--- myApply ---');
  console.log(greet.myApply(person, ['Hi', '~']));  // Hi, Alice~

  // 测试 2：myBind 部分应用
  console.log('--- myBind ---');
  const boundGreet = greet.myBind(person, 'Hey');
  console.log(boundGreet('?'));  // Hey, Alice?

  // 测试 3：myBind + new
  function Person(name, age) {
    this.name = name;
    this.age = age;
  }
  const BoundPerson = Person.myBind(null, 'Bob');
  const p = new BoundPerson(25);
  console.log('--- new + myBind ---');
  console.log(p.name);                    // Bob
  console.log(p.age);                     // 25
  console.log(p instanceof Person);       // true

  // 测试 4：null thisArg
  function getThis() { return this; }
  console.log('--- null thisArg ---');
  console.log(getThis.myCall(null) === globalThis);  // true

  // 测试 5：myApply 类型校验
  console.log('--- myApply 类型校验 ---');
  try {
    greet.myApply(person, 'not-array');
    console.log('ERROR: should have thrown');
  } catch (e) {
    console.log('myApply 非数组参数抛 TypeError:', e instanceof TypeError);  // true
  }

  // 测试 6：bound.name
  console.log('--- bound.name ---');
  console.log('Person.myBind.name:', Person.myBind({}).name);  // "bound Person"

  // 测试 7：原始值 thisArg
  console.log('--- 原始值 thisArg ---');
  function getType() { return typeof this; }
  console.log('myCall(42):', getType.myCall(42));        // "object"
  console.log('myCall(\"hi\"):', getType.myCall('hi'));    // "object"

  // 测试 8：myApply 空数组
  console.log('--- myApply 空数组 ---');
  function noArgs() { return 'ok'; }
  console.log('myApply([]):', noArgs.myApply(null, []));  // "ok"
}
