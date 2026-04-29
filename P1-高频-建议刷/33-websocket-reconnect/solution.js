/**
 * ReconnectWebSocket - 带自动重连和心跳检测的 WebSocket 封装
 *
 * 核心能力：
 * 1. 指数退避自动重连
 * 2. 心跳检测（ping/pong 保活）
 * 3. 断线消息缓存队列
 * 4. 手动关闭不重连
 */
class ReconnectWebSocket {
  /**
   * @param {string} url - WebSocket 地址
   * @param {Object} options
   * @param {number} [options.maxRetries=10] - 最大重连次数
   * @param {number} [options.heartbeatInterval=30000] - 心跳间隔（ms）
   * @param {number} [options.heartbeatTimeout=5000] - pong 超时时间（ms）
   * @param {number} [options.reconnectInterval=1000] - 初始重连间隔（ms）
   * @param {number} [options.maxReconnectInterval=30000] - 最大重连间隔上限（ms）
   * @param {number} [options.maxQueueSize=1000] - 消息队列上限
   */
  constructor(url, options = {}) {
    this.url = url;
    this.maxRetries = options.maxRetries ?? 10;
    this.heartbeatInterval = options.heartbeatInterval ?? 30000;
    this.heartbeatTimeout = options.heartbeatTimeout ?? 5000;
    this.reconnectInterval = options.reconnectInterval ?? 1000;
    this.maxReconnectInterval = options.maxReconnectInterval ?? 30000;

    // 内部状态
    this.ws = null;
    this.retryCount = 0;           // 当前已重试次数
    this.reconnectTimer = null;    // 重连定时器
    this.heartbeatTimer = null;    // 心跳发送定时器
    this.pongTimer = null;         // pong 超时检测定时器
    this.isManualClose = false;    // 是否手动关闭（手动关闭不重连）
    this.messageQueue = [];        // 断线期间的消息缓存队列
    this.maxQueueSize = options.maxQueueSize ?? 1000; // 消息队列上限
    this.isConnectedOnce = false;  // 是否曾经连接成功过（用于判断 onreconnected）

    // 外部可绑定的回调
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    this.onreconnecting = null;    // 正在重连（可选）
    this.onreconnected = null;     // 重连成功（可选）
    this.onmaxretries = null;      // 达到最大重连次数（可选）

    // 首次连接
    this._connect();
  }

  /**
   * 内部：建立 WebSocket 连接并绑定事件
   */
  _connect() {
    // 清理上一次连接的残留定时器
    this._clearTimers();

    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      // URL 格式错误等极端情况
      console.error('[ReconnectWS] 创建连接失败:', err);
      this._scheduleReconnect();
      return;
    }

    // --- 连接成功 ---
    this.ws.onopen = () => {
      console.log('[ReconnectWS] 连接成功');

      const isReconnect = this.isConnectedOnce; // 首次连接 vs 重连
      this.isConnectedOnce = true;
      this.retryCount = 0; // 重置重试计数（指数退避归零）
      this.isManualClose = false; // 重置手动关闭标记

      // 启动心跳
      this._startHeartbeat();

      // 发送缓存队列中的消息
      this._flushQueue();

      // 触发回调
      if (this.onopen) this.onopen();
      // 仅在重连后（非首次）触发 onreconnected
      if (isReconnect && this.onreconnected) this.onreconnected();
    };

    // --- 收到消息 ---
    this.ws.onmessage = (event) => {
      // 收到 pong 响应 → 重置心跳计时器
      if (event.data === 'pong') {
        this._resetPongTimer();
        return;
      }

      // 正常消息 → 交给外部回调
      if (this.onmessage) this.onmessage(event.data);
    };

    // --- 连接关闭 ---
    this.ws.onclose = (event) => {
      console.log('[ReconnectWS] 连接关闭, code:', event.code);
      this._clearTimers();

      if (this.onclose) this.onclose(event.code, event.reason);

      // 只有非手动关闭时才触发重连
      if (!this.isManualClose) {
        this._scheduleReconnect();
      }
    };

    // --- 连接错误 ---
    this.ws.onerror = (err) => {
      console.error('[ReconnectWS] 连接错误:', err);
      if (this.onerror) this.onerror(err);
      // onerror 之后通常会触发 onclose，重连逻辑在 onclose 中处理
    };
  }

  /**
   * 发送消息
   * - 连接已打开：直接发送
   * - 连接未打开：缓存到队列，等连接恢复后自动发送
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      if (this.messageQueue.length >= this.maxQueueSize) {
        console.warn('[ReconnectWS] 消息队列已满，丢弃最早消息');
        this.messageQueue.shift();
      }
      console.log('[ReconnectWS] 连接未就绪，消息已入队');
      this.messageQueue.push(data);
    }
  }

  /**
   * 获取当前连接状态（兼容 WebSocket readyState 常量）
   */
  get readyState() {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  /**
   * 手动关闭连接（不触发自动重连）
   */
  close() {
    this.isManualClose = true; // 标记为手动关闭
    this._clearTimers();
    if (this.ws) {
      this.ws.close();
    }
  }

  /**
   * 内部：调度一次重连（指数退避）
   */
  _scheduleReconnect() {
    if (this.retryCount >= this.maxRetries) {
      console.error(`[ReconnectWS] 已达最大重连次数 (${this.maxRetries})，停止重连`);
      if (this.onmaxretries) this.onmaxretries({ retryCount: this.retryCount });
      return;
    }

    // 指数退避：interval * 2^retryCount，不超过上限
    const delay = Math.min(
      this.reconnectInterval * Math.pow(2, this.retryCount),
      this.maxReconnectInterval
    );

    console.log(`[ReconnectWS] ${delay}ms 后尝试第 ${this.retryCount + 1} 次重连`);

    // 通知外部正在重连
    if (this.onreconnecting) {
      this.onreconnecting({ retryCount: this.retryCount + 1, delay });
    }

    this.reconnectTimer = setTimeout(() => {
      this.retryCount++;
      this._connect();
    }, delay);
  }

  /**
   * 内部：启动心跳机制
   * 每隔 heartbeatInterval 发送一次 "ping"
   */
  _startHeartbeat() {
    this._clearHeartbeatTimers();

    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
        console.log('[ReconnectWS] → ping');

        // 启动 pong 超时检测
        this.pongTimer = setTimeout(() => {
          // 超时未收到 pong → 判定连接已死
          console.warn('[ReconnectWS] pong 超时，主动断开');
          this.ws.close(); // 触发 onclose → 自动重连
        }, this.heartbeatTimeout);
      }
    }, this.heartbeatInterval);
  }

  /**
   * 内部：收到 pong → 清除超时计时器
   */
  _resetPongTimer() {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  /**
   * 内部：清空消息队列，按序发送
   * 发送失败的消息会被重新入队，避免丢失
   */
  _flushQueue() {
    const pending = [...this.messageQueue];
    this.messageQueue = [];
    for (let i = 0; i < pending.length; i++) {
      try {
        this.ws.send(pending[i]);
        console.log('[ReconnectWS] 发送缓存消息');
      } catch (err) {
        // 发送失败（连接在 flush 期间断开），将剩余消息重新入队
        console.warn('[ReconnectWS] 缓存消息发送失败，重新入队');
        this.messageQueue.push(...pending.slice(i));
        break;
      }
    }
  }

  /**
   * 内部：清理所有定时器（重连、心跳、pong 超时）
   */
  _clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this._clearHeartbeatTimers();
  }

  /**
   * 内部：清理心跳相关定时器
   */
  _clearHeartbeatTimers() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }
}

// ============================================================
// 使用示例
// ============================================================

// const ws = new ReconnectWebSocket('wss://example.com/ws', {
//   maxRetries: 10,
//   heartbeatInterval: 30000,
//   heartbeatTimeout: 5000,
// });
//
// ws.onopen = () => console.log('已连接');
// ws.onmessage = (data) => console.log('收到:', data);
// ws.onclose = () => console.log('连接关闭');
// ws.onerror = (err) => console.error('错误:', err);
// ws.onreconnecting = ({ retryCount, delay }) =>
//   console.log(`第 ${retryCount} 次重连，${delay}ms 后执行`);
//
// // 发送消息（断线时自动缓存）
// ws.send(JSON.stringify({ type: 'chat', content: 'hello' }));
//
// // 手动关闭（不触发重连）
// ws.close();

module.exports = ReconnectWebSocket;
