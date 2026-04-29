# 32 - 撤销/重做 - 讲解

## 第一步：理解问题

撤销/重做的本质是**状态时间线管理**。关键约束：

- **撤销**回到"过去"的状态
- **重做**恢复"未来"的状态
- **执行新操作**时，当前指针之后的"未来"必须被丢弃（历史分支被覆盖）

数据结构选择：**数组 + 指针**（快照模式）或 **双栈**（命令模式）。

---

## 第二步：核心思路

两种方案的对比：

| 维度 | 快照模式 | 命令模式 |
|------|----------|----------|
| 存储内容 | 完整状态副本 | 操作函数（execute/undo） |
| 内存开销 | O(n × stateSize) | O(n × commandSize) |
| 实现复杂度 | 低 | 中 |
| undo 可靠性 | 高（直接恢复快照） | 取决于 undo 实现的正确性 |
| 典型应用 | 表单、简单编辑器 | Photoshop、VS Code、游戏引擎 |

---

## 第三步：逐步实现

### 3.1 快照模式 — execute

```javascript
class SnapshotUndoRedo {
  constructor(initialState) {
    this.history = [this._deepClone(initialState)];
    this.currentIndex = 0;
  }

  execute(newState) {
    this.history = this.history.slice(0, this.currentIndex + 1);
    this.history.push(this._deepClone(newState));
    this.currentIndex = this.history.length - 1;
  }
```

**`slice(0, currentIndex + 1)`**：丢弃当前指针之后的所有快照。这是"新操作覆盖 redo 历史"的核心逻辑。

**`_deepClone`**：必须深拷贝，否则外部修改 state 会影响历史快照。

### 3.2 快照模式 — undo / redo

```javascript
  undo() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
    return this._deepClone(this.history[this.currentIndex]);
  }

  redo() {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
    }
    return this._deepClone(this.history[this.currentIndex]);
  }
```

undo 和 redo 本质就是移动指针。边界条件：已经在最早/最晚状态时，保持不动。

### 3.3 命令模式 — execute

```javascript
class CommandUndoRedo {
  constructor(initialState) {
    this.currentState = this._deepClone(initialState);
    this.undoStack = [];
    this.redoStack = [];
    this.history = [];
  }

  execute(command) {
    this.currentState = command.execute(this.currentState);
    this.undoStack.push(command);
    this.redoStack = [];
    this.history.push(command.name);
  }
```

执行命令：调用 `command.execute` 获取新状态，命令压入 undo 栈，清空 redo 栈。

### 3.4 命令模式 — undo / redo

```javascript
  undo() {
    if (this.undoStack.length === 0) {
      return this._deepClone(this.currentState);
    }

    const command = this.undoStack.pop();
    this.currentState = command.undo(this.currentState);
    this.redoStack.push(command);

    return this._deepClone(this.currentState);
  }

  redo() {
    if (this.redoStack.length === 0) {
      return this._deepClone(this.currentState);
    }

    const command = this.redoStack.pop();
    this.currentState = command.execute(this.currentState);
    this.undoStack.push(command);

    return this._deepClone(this.currentState);
  }
}
```

**undo**：从 undo 栈弹出命令，执行其 `undo` 方法，命令压入 redo 栈。

**redo**：从 redo 栈弹出命令，重新执行其 `execute` 方法，命令压回 undo 栈。

命令对象示例：

```javascript
const increment = {
  name: 'increment',
  execute: (state) => ({ ...state, count: state.count + 1 }),
  undo: (state) => ({ ...state, count: state.count - 1 }),
}
```

---

## 第四步：常见追问

### Q1：两种模式各自的优缺点？

- **快照模式**：实现简单、状态恢复可靠，但内存消耗大
- **命令模式**：内存高效、可序列化，但命令必须可逆

### Q2：快照模式如果状态很大如何优化？

- **增量快照**：只存储差异（delta），而非完整状态
- **结构共享**：利用 Immutable.js 等库实现结构共享
- **限制历史数量**：只保留最近 N 步

### Q3：命令模式中如果 undo 不是完全可逆的怎么办？

这是命令模式的根本限制。对于不可逆操作（如网络请求），可以：
- 在 execute 时保存快照作为回退点
- 用混合模式：关键操作用快照，普通操作用命令

### Q4：如何与 React 状态管理结合？

Redux 的 time-travel 本质就是快照模式——每个 action 对应一个状态快照。

---

## 第五步：易错点

| 易错点 | 说明 |
|-------|------|
| execute 后不清空 redo | 新操作必须丢弃"未来"历史 |
| 不做深拷贝 | 外部修改 state 会污染历史 |
| undo 边界不处理 | 已在最早状态时应保持不动 |
| 命令模式 redo 边界不处理 | 已在最新状态时应保持不动 |
| 命令的 undo 不可逆 | 必须保证 execute 和 undo 互为逆操作 |
