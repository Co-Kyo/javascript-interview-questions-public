/**
 * 32 - 撤销/重做（Undo/Redo）
 * 实现两种方案：快照模式 + 命令模式
 */

// ============================================================
// 方案一：快照模式（Snapshot Pattern）
// 核心思想：每次操作保存完整状态副本，undo/redo 切换快照指针
// ============================================================

class SnapshotUndoRedo {
  constructor(initialState) {
    // 快照栈：存储所有历史状态
    this.history = [this._deepClone(initialState)];
    // 当前指针：指向 history 中的当前位置
    this.currentIndex = 0;
  }

  /**
   * 执行新操作：保存新的状态快照
   * 关键点：执行新操作时，必须丢弃 currentIndex 之后的所有快照（清除"未来"）
   */
  execute(newState) {
    // 1. 丢弃当前指针之后的所有快照（新操作会覆盖 redo 历史）
    this.history = this.history.slice(0, this.currentIndex + 1);

    // 2. 保存新状态的深拷贝快照
    this.history.push(this._deepClone(newState));

    // 3. 移动指针到最新位置
    this.currentIndex = this.history.length - 1;
  }

  /**
   * 撤销：将指针前移一步
   */
  undo() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return this._deepClone(this.history[this.currentIndex]);
    }
    // 已经在最早的状态，无法继续撤销
    return this._deepClone(this.history[this.currentIndex]);
  }

  /**
   * 重做：将指针后移一步
   */
  redo() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      return this._deepClone(this.history[this.currentIndex]);
    }
    // 已经在最新的状态，无法继续重做
    return this._deepClone(this.history[this.currentIndex]);
  }

  /**
   * 获取当前状态（返回深拷贝，防止外部修改）
   */
  getCurrentState() {
    return this._deepClone(this.history[this.currentIndex]);
  }

  /**
   * 获取完整历史记录
   */
  getHistory() {
    return this.history.map((state) => this._deepClone(state));
  }

  /**
   * 是否可以撤销
   */
  canUndo() {
    return this.currentIndex > 0;
  }

  /**
   * 是否可以重做
   */
  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * 深拷贝工具方法（处理对象/数组等引用类型）
   * 生产环境可用 structuredClone() 替代
   */
  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (typeof structuredClone === 'function') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
  }
}

// ============================================================
// 方案二：命令模式（Command Pattern）
// 核心思想：保存操作本身（execute + undo 函数），而非状态副本
// ============================================================

class CommandUndoRedo {
  constructor(initialState) {
    // 当前状态（深拷贝，防止外部修改影响内部状态）
    this.currentState = this._deepClone(initialState);
    // 已执行命令栈（用于 undo）
    this.undoStack = [];
    // 已撤销命令栈（用于 redo）
    this.redoStack = [];
    // 命令执行历史记录（仅记录命令名称）
    this.history = [];
  }

  /**
   * 执行一个命令
   * @param {Object} command - { name, execute(state), undo(state) }
   */
  execute(command) {
    // 0. 截断 history 中被撤销的部分（新操作会覆盖 redo 历史）
    this.history = this.history.slice(0, this.undoStack.length);

    // 1. 执行命令，获取新状态
    this.currentState = command.execute(this.currentState);

    // 2. 将命令压入 undo 栈
    this.undoStack.push(command);

    // 3. 清空 redo 栈（新操作会覆盖 redo 历史）
    this.redoStack = [];

    // 4. 记录历史
    this.history.push(command.name);
  }

  /**
   * 撤销：从 undo 栈弹出命令，执行其 undo，压入 redo 栈
   * @returns {Object} 当前状态的深拷贝
   */
  undo() {
    if (this.undoStack.length === 0) {
      return this._deepClone(this.currentState);
    }

    // 1. 从 undo 栈弹出最近的命令
    const command = this.undoStack.pop();

    // 2. 执行该命令的 undo 方法，恢复上一个状态
    this.currentState = command.undo(this.currentState);

    // 3. 将命令压入 redo 栈（以便后续重做）
    this.redoStack.push(command);

    // 4. 返回当前状态的深拷贝（与快照模式 API 保持一致）
    return this._deepClone(this.currentState);
  }

  /**
   * 重做：从 redo 栈弹出命令，执行其 execute，压入 undo 栈
   * @returns {Object} 当前状态的深拷贝
   */
  redo() {
    if (this.redoStack.length === 0) {
      return this._deepClone(this.currentState);
    }

    // 1. 从 redo 栈弹出最近被撤销的命令
    const command = this.redoStack.pop();

    // 2. 重新执行该命令
    this.currentState = command.execute(this.currentState);

    // 3. 将命令压回 undo 栈
    this.undoStack.push(command);

    // 4. 返回当前状态的深拷贝（与快照模式 API 保持一致）
    return this._deepClone(this.currentState);
  }

  /**
   * 获取当前状态（返回深拷贝，防止外部修改）
   */
  getCurrentState() {
    return this._deepClone(this.currentState);
  }

  /**
   * 获取命令执行历史
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * 是否可以撤销
   */
  canUndo() {
    return this.undoStack.length > 0;
  }

   /**
    * 是否可以重做
    */
  canRedo() {
    return this.redoStack.length > 0;
  }

  /**
   * 深拷贝工具方法（与 SnapshotUndoRedo 保持一致）
   * 生产环境可用 structuredClone() 替代
   */
  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (typeof structuredClone === 'function') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
  }
}

// ============================================================
// 运行示例 & 测试
// ============================================================

// --- 快照模式测试 ---
console.log('===== 快照模式测试 =====');
const snapshotManager = new SnapshotUndoRedo({ count: 0, text: '' });

snapshotManager.execute({ count: 1, text: 'a' });
snapshotManager.execute({ count: 2, text: 'ab' });
snapshotManager.execute({ count: 3, text: 'abc' });
console.log('执行3次后:', snapshotManager.getCurrentState());
// → { count: 3, text: 'abc' }

console.log('undo:', snapshotManager.undo());
// → { count: 2, text: 'ab' }

console.log('undo:', snapshotManager.undo());
// → { count: 1, text: 'a' }

console.log('redo:', snapshotManager.redo());
// → { count: 2, text: 'ab' }

console.log('历史:', snapshotManager.getHistory());
// → [{ count: 0 }, { count: 1 }, { count: 2 }, { count: 3 }]

// --- 命令模式测试 ---
console.log('\n===== 命令模式测试 =====');

const increment = {
  name: 'increment',
  execute: (state) => ({ ...state, count: state.count + 1 }),
  undo: (state) => ({ ...state, count: state.count - 1 }),
};

const double = {
  name: 'double',
  execute: (state) => ({ ...state, count: state.count * 2 }),
  undo: (state) => ({ ...state, count: state.count / 2 }),
};

const commandManager = new CommandUndoRedo({ count: 1 });

commandManager.execute(increment); // count: 1 → 2
commandManager.execute(double);    // count: 2 → 4
commandManager.execute(increment); // count: 4 → 5

console.log('执行3次后:', commandManager.getCurrentState());
// → { count: 5 }

console.log('undo:', commandManager.undo());
// → { count: 4 }  (撤销 increment)

console.log('undo:', commandManager.undo());
// → { count: 2 }  (撤销 double)

console.log('redo:', commandManager.redo());
// → { count: 4 }  (重做 double)

console.log('历史:', commandManager.getHistory());
// → ['increment', 'double', 'increment']
