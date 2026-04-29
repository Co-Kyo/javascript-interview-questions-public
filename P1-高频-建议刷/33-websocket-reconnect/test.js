const ReconnectWebSocket = require('./solution.js')

// Mock WebSocket for testing
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    this._sent = [];
    this._closed = false;

    if (!MockWebSocket._failConnect) {
      setTimeout(() => {
        if (!this._closed) {
          this.readyState = 1;
          if (this.onopen) this.onopen();
        }
      }, 10);
    } else {
      setTimeout(() => {
        this.readyState = 3;
        if (this.onclose) this.onclose({ code: 1006, reason: '' });
      }, 10);
    }
  }

  send(data) {
    this._sent.push(data);
  }

  close() {
    this._closed = true;
    this.readyState = 3;
    if (this.onclose) this.onclose({ code: 1000, reason: '' });
  }

  simulateMessage(data) {
    if (this.onmessage) this.onmessage({ data });
  }

  simulateClose(code = 1006) {
    this.readyState = 3;
    if (this.onclose) this.onclose({ code, reason: '' });
  }
}

MockWebSocket._failConnect = false;

const OriginalWebSocket = global.WebSocket;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runTests() {
  global.WebSocket = MockWebSocket;

  // 测试1: 基本连接和 onopen 回调
  {
    MockWebSocket._failConnect = false;
    const ws = new ReconnectWebSocket('ws://localhost');
    let opened = false;
    ws.onopen = () => { opened = true };
    await sleep(50);
    console.assert(opened === true, '基本连接 onopen 回调');
    ws.close();
  }

  // 测试2: 消息缓存 - 连接前 send 入队，连接后 flush
  {
    MockWebSocket._failConnect = false;
    const ws = new ReconnectWebSocket('ws://localhost');
    ws.send('msg1');
    ws.send('msg2');
    await sleep(50);
    console.assert(ws.ws._sent.includes('msg1'), '缓存消息连接后发送: msg1');
    console.assert(ws.ws._sent.includes('msg2'), '缓存消息连接后发送: msg2');
    ws.close();
  }

  // 测试3: 手动关闭不重连
  {
    MockWebSocket._failConnect = false;
    let reconnectAttempted = false;
    const ws = new ReconnectWebSocket('ws://localhost', { maxRetries: 3, reconnectInterval: 50 });
    ws.onreconnecting = () => { reconnectAttempted = true };
    await sleep(50);
    ws.close();
    await sleep(200);
    console.assert(reconnectAttempted === false, '手动关闭不重连');
  }

  // 测试4: 意外断开触发重连
  {
    MockWebSocket._failConnect = false;
    let reconnectAttempted = false;
    const ws = new ReconnectWebSocket('ws://localhost', { maxRetries: 3, reconnectInterval: 50 });
    ws.onreconnecting = () => { reconnectAttempted = true };
    await sleep(50);
    ws.ws.simulateClose(1006);
    await sleep(200);
    console.assert(reconnectAttempted === true, '意外断开触发重连');
    ws.close();
  }

  // 测试5: 指数退避间隔递增 (连接持续失败)
  {
    MockWebSocket._failConnect = true;
    const delays = [];
    const ws = new ReconnectWebSocket('ws://localhost', {
      maxRetries: 5,
      reconnectInterval: 100,
      maxReconnectInterval: 10000,
    });
    ws.onreconnecting = ({ delay }) => { delays.push(delay) };
    await sleep(800);
    console.assert(delays[0] === 100, '第1次重连间隔: ' + delays[0]);
    console.assert(delays[1] === 200, '第2次重连间隔: ' + delays[1]);
    console.assert(delays[2] === 400, '第3次重连间隔: ' + delays[2]);
    ws.close();
    MockWebSocket._failConnect = false;
  }

  // 测试6: 重连成功后重置 retryCount
  {
    MockWebSocket._failConnect = false;
    let reconnectCount = 0;
    const ws = new ReconnectWebSocket('ws://localhost', { maxRetries: 5, reconnectInterval: 50 });
    ws.onreconnected = () => { reconnectCount++ };
    await sleep(50);
    ws.ws.simulateClose(1006);
    await sleep(200);
    console.assert(reconnectCount >= 1, '重连成功触发 onreconnected');
    console.assert(ws.retryCount === 0, '重连成功后重置 retryCount');
    ws.close();
  }

  // 测试7: 消息队列上限
  {
    MockWebSocket._failConnect = false;
    const ws = new ReconnectWebSocket('ws://localhost', { maxQueueSize: 3 });
    ws.send('a');
    ws.send('b');
    ws.send('c');
    ws.send('d');
    console.assert(ws.messageQueue.length === 3, '消息队列上限: ' + ws.messageQueue.length);
    console.assert(ws.messageQueue[0] === 'b', '丢弃最早消息');
    ws.close();
  }

  // 测试8: readyState getter
  {
    MockWebSocket._failConnect = false;
    const ws = new ReconnectWebSocket('ws://localhost');
    await sleep(50);
    console.assert(ws.readyState === 1, 'readyState 连接后为 OPEN');
    ws.close();
  }

  // 测试9: 收到 pong 不传递给 onmessage
  {
    MockWebSocket._failConnect = false;
    const ws = new ReconnectWebSocket('ws://localhost');
    const messages = [];
    ws.onmessage = (data) => messages.push(data);
    await sleep(50);
    ws.ws.simulateMessage('pong');
    ws.ws.simulateMessage('hello');
    console.assert(messages.length === 1, 'pong 不传递给 onmessage');
    console.assert(messages[0] === 'hello', '普通消息正常传递');
    ws.close();
  }

  // 测试10: maxRetries 用尽触发 onmaxretries
  {
    MockWebSocket._failConnect = true;
    let maxReached = false;
    const ws = new ReconnectWebSocket('ws://localhost', {
      maxRetries: 2,
      reconnectInterval: 50,
    });
    ws.onmaxretries = () => { maxReached = true };
    await sleep(500);
    console.assert(maxReached === true, 'maxRetries 用尽触发 onmaxretries');
    ws.close();
    MockWebSocket._failConnect = false;
  }

  global.WebSocket = OriginalWebSocket;
  console.log('✅ 全部通过');
}

runTests().catch(console.error);
