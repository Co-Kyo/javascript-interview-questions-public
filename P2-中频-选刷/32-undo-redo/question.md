> 🟢 **优先级：P2（中频）** — 偏系统设计/项目深挖，选刷

# 32 - 撤销/重做（Undo/Redo）

## 分类
工程实用场景

## 难度
⭐⭐⭐

## 考察点
栈结构、快照模式、命令模式

---

## 题目要求

实现两种方案的撤销/重做功能：

### 方案一：快照模式（SnapshotUndoRedo）

每次操作保存完整状态副本，undo/redo 切换快照指针。

```javascript
class SnapshotUndoRedo {
  execute(state)     // 执行操作，保存新状态快照
  undo()             // 撤销，返回当前状态深拷贝
  redo()             // 重做，返回当前状态深拷贝
  getCurrentState()  // 获取当前状态（深拷贝）
  getHistory()       // 获取所有快照（深拷贝数组）
  canUndo()          // 是否可以撤销
  canRedo()          // 是否可以重做
}
```

### 方案二：命令模式（CommandUndoRedo）

每次操作保存命令对象（含 `execute` 和 `undo` 方法）。

```javascript
class CommandUndoRedo {
  execute(command)   // 执行命令 { name, execute(state), undo(state) }
  undo()             // 撤销，返回当前状态深拷贝
  redo()             // 重做，返回当前状态深拷贝
  getCurrentState()  // 获取当前状态（深拷贝）
  getHistory()       // 获取命令执行历史
  canUndo()          // 是否可以撤销
  canRedo()          // 是否可以重做
}
```

## 示例

```javascript
// 快照模式
const m = new SnapshotUndoRedo({ count: 0 })
m.execute({ count: 1 })
m.execute({ count: 2 })
m.undo()  // { count: 1 }
m.redo()  // { count: 2 }

// 命令模式
const increment = {
  name: 'increment',
  execute: (state) => ({ count: state.count + 1 }),
  undo: (state) => ({ count: state.count - 1 }),
}
const m2 = new CommandUndoRedo({ count: 0 })
m2.execute(increment) // { count: 1 }
m2.undo()             // { count: 0 }
m2.redo()             // { count: 1 }
```

## 约束条件

1. 撤销到初始状态后，继续 undo 无效
2. 重做到最新状态后，继续 redo 无效
3. 执行新操作后，之前被撤销的重做历史必须被清除
4. 所有返回的状态必须是深拷贝，防止外部修改影响内部状态
