# 32 - 撤销/重做（Undo/Redo）讲解

## 第一步：理解核心问题

撤销/重做的本质是一个 **状态时间线管理** 问题。

```
时间线：  State0 → State1 → State2 → State3 → State4
                                    ↑
                                 当前位置

undo:    指针左移  →  State2 → State1
redo:    指针右移  →  State2 → State3 → State4
```

关键约束：
- **撤销**是回到"过去"的状态
- **重做**是恢复"未来"的状态
- **执行新操作**时，当前指针之后的"未来"必须被丢弃（因为历史分支被覆盖了）

数据结构选择：**栈**（或数组 + 指针）。undo 栈保存过去，redo 栈保存未来。

---

## 第二步：快照模式 — 最直观的方案

### 核心思路

每次操作时，把整个状态 **完整复制一份** 存起来。undo 就是回到上一个副本，redo 就是回到下一个副本。

```
快照历史（数组 + 指针）：

[S0, S1, S2, S3]
              ↑
           currentIndex

undo → currentIndex-- → 指向 S2
redo → currentIndex++ → 指向 S3
```

### 实现要点

```js
// execute：保存新快照，清除"未来"
execute(newState) {
  this.history = this.history.slice(0, this.currentIndex + 1); // 丢弃未来
  this.history.push(deepClone(newState));                       // 保存新快照
  this.currentIndex++;
}

// undo：指针前移
undo() {
  if (this.currentIndex > 0) this.currentIndex--;
}

// redo：指针后移
redo() {
  if (this.currentIndex < this.history.length - 1) this.currentIndex++;
}
```

### 优缺点

| 优点 | 缺点 |
|------|------|
| 实现简单，容易理解 | 内存消耗大（每步存完整状态） |
| 状态恢复可靠（直接替换） | 深拷贝性能开销 |
| 无需关心操作细节 | 状态对象越大越浪费 |

**适用场景**：状态较小、操作复杂的场景（如表单编辑器、简单绘图工具）。

---

## 第三步：命令模式 — 更灵活的方案

### 核心思路

不保存状态本身，而是保存 **操作（命令）**。每个命令知道自己怎么执行（execute）和怎么撤销（undo）。

```
undoStack:  [cmd1, cmd2, cmd3]  ← 已执行的命令
redoStack:  []                  ← 被撤销的命令

undo: 从 undoStack 弹出 cmd3，执行 cmd3.undo()，压入 redoStack
redo: 从 redoStack 弹出 cmd3，执行 cmd3.execute()，压入 undoStack
```

### 实现要点

```js
// execute：执行命令，压入 undo 栈，清空 redo 栈
execute(command) {
  this.currentState = command.execute(this.currentState);
  this.undoStack.push(command);
  this.redoStack = [];  // 新操作覆盖 redo
}

// undo：弹出 undo 栈顶命令，执行其 undo，压入 redo 栈
undo() {
  if (this.undoStack.length === 0) return this._deepClone(this.currentState);
  const cmd = this.undoStack.pop();
  this.currentState = cmd.undo(this.currentState);
  this.redoStack.push(cmd);
  return this._deepClone(this.currentState);
}

// redo：弹出 redo 栈顶命令，执行其 execute，压入 undo 栈
redo() {
  if (this.redoStack.length === 0) return this._deepClone(this.currentState);
  const cmd = this.redoStack.pop();
  this.currentState = cmd.execute(this.currentState);
  this.undoStack.push(cmd);
  return this._deepClone(this.currentState);
}
```

### 命令对象示例

```js
const addText = {
  name: 'addText',
  execute: (state) => ({ ...state, text: state.text + 'A' }),
  undo: (state) => ({ ...state, text: state.text.slice(0, -1) }),
};
```

### 优缺点

| 优点 | 缺点 |
|------|------|
| 内存高效（只存操作，不存状态） | 命令必须可逆（undo 逻辑要正确） |
| 灵活（可组合、可序列化） | 实现复杂度较高 |
| 可记录有意义的操作名称 | 状态恢复依赖命令链的正确性 |

**适用场景**：状态较大、操作明确且可逆的场景（如画图工具、代码编辑器、游戏）。

---

## 第四步：两种模式对比

| 维度 | 快照模式 | 命令模式 |
|------|----------|----------|
| 存储内容 | 完整状态副本 | 操作函数（execute/undo） |
| 内存开销 | O(n × stateSize) | O(n × commandSize)，取决于命令复杂度 |
| 实现复杂度 | 低 | 中 |
| undo 可靠性 | 高（直接恢复快照） | 取决于 undo 实现的正确性 |
| 命令可逆性要求 | 无（快照不需要） | 必须可逆 |
| 序列化/持久化 | 难（需要序列化整个状态） | 易（命令可以序列化为 JSON） |
| 典型应用 | 表单、简单编辑器 | Photoshop、VS Code、游戏引擎 |

### 选择建议

- **状态小、操作复杂** → 快照模式（简单可靠）
- **状态大、操作明确** → 命令模式（省内存）
- **需要网络同步/持久化** → 命令模式（可以传输命令而非完整状态）
- **不确定时** → 先用快照模式，性能有问题再优化为命令模式

---

## 第五步：进阶优化与面试追问

### 1. 限制历史记录数量

```js
execute(newState) {
  this.history.push(deepClone(newState));
  // 只保留最近 50 条
  if (this.history.length > 50) {
    this.history.shift(); // 丢弃最早的历史
  }
  this.currentIndex = this.history.length - 1;
}
```

### 2. 快照模式内存优化

- **增量快照**：只存储差异（delta），而非完整状态
- **结构共享**：利用 Immutable.js 等库实现结构共享，减少内存占用
- **压缩**：对历史快照进行压缩存储

### 3. 与 React 状态管理结合

```js
// Redux 的 time-travel 本质就是快照模式
// 每个 action 对应一个状态快照
const [history, dispatch] = useReducerWithHistory(reducer, initialState);
```

### 4. 命令模式的组合命令

```js
// 宏命令：将多个命令组合为一个
const macroCommand = {
  name: 'batchUpdate',
  execute: (state) => commands.reduce((s, cmd) => cmd.execute(s), state),
  undo: (state) => [...commands].reverse().reduce((s, cmd) => cmd.undo(s), state),
};
```

### 5. 防抖优化

对于高频操作（如拖拽），可以防抖后再保存快照：

```js
const debouncedSave = debounce(() => {
  manager.execute(currentState);
}, 300);
```

---

## 总结

| 概念 | 说明 |
|------|------|
| 栈结构 | undo/redo 的底层数据结构，LIFO 管理操作历史 |
| 快照模式 | 保存状态副本，简单直接，内存换可靠性 |
| 命令模式 | 保存操作函数，灵活高效，需要可逆性保证 |
| 分支管理 | 执行新操作时清除 redo 历史，这是所有方案的共同规则 |
| 适用场景 | 根据状态大小、操作复杂度、持久化需求选择方案 |
