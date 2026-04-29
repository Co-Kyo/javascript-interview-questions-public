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

  getCurrentState() {
    return this._deepClone(this.history[this.currentIndex]);
  }

  getHistory() {
    return this.history.map((state) => this._deepClone(state));
  }

  canUndo() {
    return this.currentIndex > 0;
  }

  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }

  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (typeof structuredClone === 'function') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
  }
}

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

  getCurrentState() {
    return this._deepClone(this.currentState);
  }

  getHistory() {
    return [...this.history];
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  _deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (typeof structuredClone === 'function') return structuredClone(obj);
    return JSON.parse(JSON.stringify(obj));
  }
}

module.exports = { SnapshotUndoRedo, CommandUndoRedo };
