class ReconnectWebSocket {
  constructor(url, options = {}) {
    this.url = url;
    this.maxRetries = options.maxRetries ?? 10;
    this.heartbeatInterval = options.heartbeatInterval ?? 30000;
    this.heartbeatTimeout = options.heartbeatTimeout ?? 5000;
    this.reconnectInterval = options.reconnectInterval ?? 1000;
    this.maxReconnectInterval = options.maxReconnectInterval ?? 30000;

    this.ws = null;
    this.retryCount = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.pongTimer = null;
    this.isManualClose = false;
    this.messageQueue = [];
    this.maxQueueSize = options.maxQueueSize ?? 1000;
    this.isConnectedOnce = false;

    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    this.onreconnecting = null;
    this.onreconnected = null;
    this.onmaxretries = null;

    this._connect();
  }

  _connect() {
    this._clearTimers();

    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      const isReconnect = this.isConnectedOnce;
      this.isConnectedOnce = true;
      this.retryCount = 0;
      this.isManualClose = false;

      this._startHeartbeat();
      this._flushQueue();

      if (this.onopen) this.onopen();
      if (isReconnect && this.onreconnected) this.onreconnected();
    };

    this.ws.onmessage = (event) => {
      if (event.data === 'pong') {
        this._resetPongTimer();
        return;
      }
      if (this.onmessage) this.onmessage(event.data);
    };

    this.ws.onclose = (event) => {
      this._clearTimers();
      if (this.onclose) this.onclose(event.code, event.reason);
      if (!this.isManualClose) {
        this._scheduleReconnect();
      }
    };

    this.ws.onerror = (err) => {
      if (this.onerror) this.onerror(err);
    };
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      if (this.messageQueue.length >= this.maxQueueSize) {
        this.messageQueue.shift();
      }
      this.messageQueue.push(data);
    }
  }

  get readyState() {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  close() {
    this.isManualClose = true;
    this._clearTimers();
    if (this.ws) {
      this.ws.close();
    }
  }

  _scheduleReconnect() {
    if (this.retryCount >= this.maxRetries) {
      if (this.onmaxretries) this.onmaxretries({ retryCount: this.retryCount });
      return;
    }

    const delay = Math.min(
      this.reconnectInterval * Math.pow(2, this.retryCount),
      this.maxReconnectInterval
    );

    if (this.onreconnecting) {
      this.onreconnecting({ retryCount: this.retryCount + 1, delay });
    }

    this.reconnectTimer = setTimeout(() => {
      this.retryCount++;
      this._connect();
    }, delay);
  }

  _startHeartbeat() {
    this._clearHeartbeatTimers();

    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');

        this.pongTimer = setTimeout(() => {
          this.ws.close();
        }, this.heartbeatTimeout);
      }
    }, this.heartbeatInterval);
  }

  _resetPongTimer() {
    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = null;
    }
  }

  _flushQueue() {
    const pending = [...this.messageQueue];
    this.messageQueue = [];
    for (let i = 0; i < pending.length; i++) {
      try {
        this.ws.send(pending[i]);
      } catch (err) {
        this.messageQueue.push(...pending.slice(i));
        break;
      }
    }
  }

  _clearTimers() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this._clearHeartbeatTimers();
  }

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

module.exports = ReconnectWebSocket;
