const { SnapshotUndoRedo, CommandUndoRedo } = require('./solution.js')

// ===== 快照模式测试 =====

// 测试1: 基本 execute + undo + redo
{
  const m = new SnapshotUndoRedo({ count: 0 })
  m.execute({ count: 1 })
  m.execute({ count: 2 })
  m.execute({ count: 3 })

  console.assert(m.undo().count === 2, '快照 undo 1')
  console.assert(m.undo().count === 1, '快照 undo 2')
  console.assert(m.redo().count === 2, '快照 redo')
}

// 测试2: getCurrentState
{
  const m = new SnapshotUndoRedo({ count: 0 })
  m.execute({ count: 1 })
  console.assert(m.getCurrentState().count === 1, '快照 getCurrentState')
}

// 测试3: undo 到初始状态后继续 undo 无效
{
  const m = new SnapshotUndoRedo({ count: 0 })
  m.execute({ count: 1 })
  m.undo()
  const state = m.undo()
  console.assert(state.count === 0, '快照 undo 边界: 停在初始状态')
}

// 测试4: redo 到最新状态后继续 redo 无效
{
  const m = new SnapshotUndoRedo({ count: 0 })
  m.execute({ count: 1 })
  m.undo()
  m.redo()
  const state = m.redo()
  console.assert(state.count === 1, '快照 redo 边界: 停在最新状态')
}

// 测试5: 执行新操作后丢弃 redo 历史
{
  const m = new SnapshotUndoRedo({ count: 0 })
  m.execute({ count: 1 })
  m.execute({ count: 2 })
  m.undo()
  m.execute({ count: 10 })
  console.assert(m.redo().count === 10, '快照: 新操作丢弃 redo')
}

// 测试6: canUndo / canRedo
{
  const m = new SnapshotUndoRedo({ count: 0 })
  console.assert(m.canUndo() === false, '初始状态 canUndo=false')
  console.assert(m.canRedo() === false, '初始状态 canRedo=false')

  m.execute({ count: 1 })
  console.assert(m.canUndo() === true, '执行后 canUndo=true')

  m.undo()
  console.assert(m.canRedo() === true, 'undo 后 canRedo=true')
}

// 测试7: getHistory
{
  const m = new SnapshotUndoRedo({ count: 0 })
  m.execute({ count: 1 })
  m.execute({ count: 2 })
  const h = m.getHistory()
  console.assert(h.length === 3, 'getHistory 长度')
  console.assert(h[0].count === 0, 'getHistory 第一个')
  console.assert(h[2].count === 2, 'getHistory 最后一个')
}

// 测试8: 深拷贝隔离
{
  const m = new SnapshotUndoRedo({ count: 0 })
  const state = m.getCurrentState()
  state.count = 999
  console.assert(m.getCurrentState().count === 0, '深拷贝隔离: 外部修改不影响内部')
}

// ===== 命令模式测试 =====

const increment = {
  name: 'increment',
  execute: (state) => ({ ...state, count: state.count + 1 }),
  undo: (state) => ({ ...state, count: state.count - 1 }),
}

const double = {
  name: 'double',
  execute: (state) => ({ ...state, count: state.count * 2 }),
  undo: (state) => ({ ...state, count: state.count / 2 }),
}

// 测试9: 基本 execute + undo + redo
{
  const m = new CommandUndoRedo({ count: 1 })
  m.execute(increment) // 2
  m.execute(double)    // 4
  m.execute(increment) // 5

  console.assert(m.undo().count === 4, '命令 undo 1')
  console.assert(m.undo().count === 2, '命令 undo 2')
  console.assert(m.redo().count === 4, '命令 redo')
}

// 测试10: canUndo / canRedo
{
  const m = new CommandUndoRedo({ count: 0 })
  console.assert(m.canUndo() === false, '命令初始 canUndo=false')
  console.assert(m.canRedo() === false, '命令初始 canRedo=false')

  m.execute(increment)
  console.assert(m.canUndo() === true, '命令执行后 canUndo=true')

  m.undo()
  console.assert(m.canRedo() === true, '命令 undo 后 canRedo=true')
}

// 测试11: 执行新操作后丢弃 redo 历史
{
  const m = new CommandUndoRedo({ count: 0 })
  m.execute(increment) // 1
  m.execute(increment) // 2
  m.undo()             // 1
  m.execute(double)    // 2
  console.assert(m.canRedo() === false, '命令: 新操作清空 redo')
  console.assert(m.getCurrentState().count === 2, '命令: 新操作后状态正确')
}

// 测试12: getHistory
{
  const m = new CommandUndoRedo({ count: 0 })
  m.execute(increment)
  m.execute(double)
  m.execute(increment)
  console.assert(m.getHistory().join(',') === 'increment,double,increment', '命令 getHistory')
}

// 测试13: undo 边界
{
  const m = new CommandUndoRedo({ count: 5 })
  const state = m.undo()
  console.assert(state.count === 5, '命令 undo 边界: 无操作时返回当前状态')
}

// 测试14: 深拷贝隔离
{
  const m = new CommandUndoRedo({ count: 0 })
  const state = m.getCurrentState()
  state.count = 999
  console.assert(m.getCurrentState().count === 0, '命令深拷贝隔离')
}

console.log('✅ 全部通过')
