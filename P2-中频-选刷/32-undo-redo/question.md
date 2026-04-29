> 🟢 **优先级：P2（中频）** — 偏系统设计/项目深挖，选刷

# 32 - 撤销/重做（Undo/Redo）

## 题目信息

| 项目 | 内容 |
|------|------|
| 分类 | 工程实用场景 |
| 难度 | ⭐⭐⭐ |
| 考察点 | 栈结构、快照模式、命令模式 |

---

## 题目背景

在画图工具、文本编辑器、表单编辑器等应用中，「撤销/重做」是用户最常用的交互之一。用户按下 `Ctrl+Z` 撤销上一步操作，按下 `Ctrl+Shift+Z`（或 `Ctrl+Y`）重做，这些背后需要一个可靠的数据结构来管理操作历史。

请你实现一个通用的 `UndoRedo` 类，支持基本的撤销/重做能力，并分别用 **快照模式** 和 **命令模式** 两种方案实现。

---

## 功能要求

### 方案一：快照模式（Snapshot）

每次操作时，保存完整的状态快照。

```
class SnapshotUndoRedo {
  execute(state)    // 执行操作，保存新的状态快照
  undo()            // 撤销，恢复到上一个状态（返回当前状态的深拷贝）
  redo()            // 重做，恢复到下一个状态（返回当前状态的深拷贝）
  getCurrentState() // 获取当前状态（返回深拷贝）
  getHistory()      // 获取操作历史（所有快照的深拷贝数组）
  canUndo()         // 是否可以撤销
  canRedo()         // 是否可以重做
}
```

### 方案二：命令模式（Command）

每次操作时，保存一个命令对象（包含 `execute` 和 `undo` 方法）。

```
class CommandUndoRedo {
  execute(command)   // 执行一个命令对象
  undo()             // 撤销上一个命令（返回当前状态的深拷贝）
  redo()             // 重做下一个命令（返回当前状态的深拷贝）
  getCurrentState()  // 获取当前状态（返回深拷贝）
  getHistory()       // 获取命令执行历史
  canUndo()          // 是否可以撤销
  canRedo()          // 是否可以重做
}
```

命令对象接口：
```js
{
  name: '命令名称',
  execute(state) { /* 执行操作，返回新状态 */ },
  undo(state) { /* 撤销操作，返回上一个状态 */ }
}
```

---

## 使用示例

### 快照模式示例

```js
const manager = new SnapshotUndoRedo({ count: 0 });

manager.execute({ count: 1 });  // 当前状态 { count: 1 }
manager.execute({ count: 2 });  // 当前状态 { count: 2 }
manager.execute({ count: 3 });  // 当前状态 { count: 3 }

manager.undo();                  // 恢复到 { count: 2 }
manager.undo();                  // 恢复到 { count: 1 }
manager.redo();                  // 恢复到 { count: 2 }

console.log(manager.getCurrentState()); // { count: 2 }
console.log(manager.getHistory());      // [{ count: 0 }, { count: 1 }, { count: 2 }, { count: 3 }]
```

### 命令模式示例

```js
const manager = new CommandUndoRedo({ count: 0 });

// 定义命令
const increment = {
  name: 'increment',
  execute: (state) => ({ count: state.count + 1 }),
  undo: (state) => ({ count: state.count - 1 })
};

const decrement = {
  name: 'decrement',
  execute: (state) => ({ count: state.count - 1 }),
  undo: (state) => ({ count: state.count + 1 })
};

manager.execute(increment);  // 当前状态 { count: 1 }
manager.execute(increment);  // 当前状态 { count: 2 }
manager.execute(decrement);  // 当前状态 { count: 1 }

manager.undo();               // 撤销 decrement → { count: 2 }
manager.undo();               // 撤销 increment → { count: 1 }
manager.redo();               // 重做 increment → { count: 2 }

console.log(manager.getHistory()); // ['increment', 'increment', 'decrement']
```

---

## 约束与边界

1. **撤销到初始状态后**，继续 `undo()` 应该无效（不做任何操作）
2. **重做到最新状态后**，继续 `redo()` 应该无效（不做任何操作）
3. **执行新操作后**，之前被撤销的重做历史应该被清除（分支管理）
4. 快照模式需考虑状态是对象时的深拷贝问题
5. 命令模式需保证命令的 `execute` 和 `undo` 是可逆的

---

## 评分标准

| 等级 | 要求 |
|------|------|
| 及格 | 能用快照模式实现基本的 undo/redo |
| 良好 | 能同时实现快照和命令两种模式，处理好边界情况 |
| 优秀 | 能深入分析两种模式的优劣、内存开销、适用场景，考虑深拷贝性能优化 |

---

## 追问方向

1. 两种模式各自的优缺点是什么？什么时候用哪种？
2. 快照模式如果状态很大（如一张高清图片），如何优化内存？
3. 命令模式中，如果某个命令的 undo 不是完全可逆的怎么办？
4. 如何实现限制历史记录数量（如最多保留 50 步）？
5. 在 React/Vue 等框架中，如何将 UndoRedo 与状态管理结合？
