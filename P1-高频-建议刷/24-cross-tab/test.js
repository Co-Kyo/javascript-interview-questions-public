/**
 * 24 - 跨标签页通信 CrossTab — 测试
 * 运行：node test.js
 *
 * 注意：此测试通过模拟浏览器 API 来验证核心逻辑。
 * 完整的跨标签页测试请在浏览器中运行。
 */

// --- 模拟 BroadcastChannel ---

const channels = {};

class MockBroadcastChannel {
  constructor(name) {
    this.name = name;
    this.onmessage = null;
    if (!channels[name]) channels[name] = [];
    channels[name].push(this);
  }
  postMessage(data) {
    const peers = channels[this.name] || [];
    for (const peer of peers) {
      if (peer !== this && peer.onmessage) {
        // 异步分发，模拟真实行为
        Promise.resolve().then(() => peer.onmessage({ data }));
      }
    }
  }
  close() {
    const peers = channels[this.name] || [];
    const idx = peers.indexOf(this);
    if (idx > -1) peers.splice(idx, 1);
  }
}

global.BroadcastChannel = MockBroadcastChannel;
global.window = global;
global.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] || null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
  key(i) { return Object.keys(this._store)[i] || null; },
  get length() { return Object.keys(this._store).length; },
};

const { CrossTab } = require('./solution.js');

// --- 基础功能测试 ---

async function runTests() {
  // 广播通道：两个实例通信
  const tabA = new CrossTab('test-channel');
  const tabB = new CrossTab('test-channel');

  let received = null;
  tabB.on('LOGIN', (payload) => { received = payload; });

  tabA.post('LOGIN', { userId: '123', name: 'Alice' });
  await new Promise(r => setTimeout(r, 50));

  console.assert(received !== null, 'BroadcastChannel: 消息被接收');
  console.assert(received.userId === '123', 'BroadcastChannel: payload 正确');
  console.assert(received.name === 'Alice', 'BroadcastChannel: payload 字段正确');

  // 自身不回显
  let selfReceived = false;
  tabA.on('PING', () => { selfReceived = true; });
  tabA.post('PING', {});
  await new Promise(r => setTimeout(r, 50));
  console.assert(selfReceived === false, 'BroadcastChannel: 自身不回显');

  // 通配符监听
  let wildcardType = null;
  let wildcardPayload = null;
  const tabC = new CrossTab('test-channel');
  tabC.on('*', (type, payload) => {
    wildcardType = type;
    wildcardPayload = payload;
  });

  tabA.post('LOGOUT', { reason: 'timeout' });
  await new Promise(r => setTimeout(r, 50));
  console.assert(wildcardType === 'LOGOUT', '通配符: 收到消息类型');
  console.assert(wildcardPayload.reason === 'timeout', '通配符: 收到 payload');

  // off 取消订阅
  let callCount = 0;
  const counter = () => { callCount++; };
  tabC.on('COUNT', counter);
  tabA.post('COUNT', {});
  await new Promise(r => setTimeout(r, 50));
  console.assert(callCount === 1, 'on 注册后能收到消息');

  tabC.off('COUNT', counter);
  tabA.post('COUNT', {});
  await new Promise(r => setTimeout(r, 50));
  console.assert(callCount === 1, 'off 取消后不再收到消息');

  // destroy 后不发送不接收
  tabC.destroy();
  let destroyedReceived = false;
  tabC.on('TEST', () => { destroyedReceived = true; });
  tabA.post('TEST', {});
  await new Promise(r => setTimeout(r, 50));
  console.assert(destroyedReceived === false, 'destroy 后不接收消息');

  // 清理
  tabA.destroy();
  tabB.destroy();

  // 参数校验
  try {
    new CrossTab('');
    console.assert(false, '空字符串应抛 TypeError');
  } catch (e) {
    console.assert(e instanceof TypeError, '空 channelName 抛 TypeError');
  }

  console.log('✅ 全部通过');
}

runTests().catch(console.error);
