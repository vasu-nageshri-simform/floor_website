// State: in-memory plan data, selection, undo/redo. No localStorage/sessionStorage/IndexedDB.

const PIXELS_PER_METER = 60;

function emptyPlan() {
  return {
    meta: { version: 1, pixelsPerMeter: PIXELS_PER_METER, name: "Untitled Plan" },
    walls: [],
    rooms: [],
    openings: [],
    furniture: []
  };
}

let idCounters = { w: 0, r: 0, o: 0, f: 0 };

function genId(prefix) {
  idCounters[prefix] = (idCounters[prefix] || 0) + 1;
  return prefix + idCounters[prefix] + "_" + Math.random().toString(36).slice(2, 7);
}

const AppState = {
  plan: emptyPlan(),
  selection: null, // { type: 'wall'|'room'|'opening'|'furniture', id: string }
  undoStack: [],
  redoStack: [],
  UNDO_LIMIT: 100
};

function clonePlan(plan) {
  return JSON.parse(JSON.stringify(plan));
}

// Push current plan state to undo stack. Call AFTER a committed action.
function commitAction() {
  AppState.undoStack.push(clonePlan(AppState.plan));
  if (AppState.undoStack.length > AppState.UNDO_LIMIT) AppState.undoStack.shift();
  AppState.redoStack = [];
  notifyChange();
}

function undo() {
  if (AppState.undoStack.length === 0) return false;
  AppState.redoStack.push(clonePlan(AppState.plan));
  AppState.plan = AppState.undoStack.pop();
  clearSelection();
  notifyChange();
  return true;
}

function redo() {
  if (AppState.redoStack.length === 0) return false;
  AppState.undoStack.push(clonePlan(AppState.plan));
  AppState.plan = AppState.redoStack.pop();
  clearSelection();
  notifyChange();
  return true;
}

function resetUndoHistory() {
  AppState.undoStack = [];
  AppState.redoStack = [];
}

function setSelection(type, id) {
  AppState.selection = type && id ? { type, id } : null;
}

function clearSelection() {
  AppState.selection = null;
}

function findById(arr, id) {
  return arr.find(function (item) { return item.id === id; });
}

function getSelectedObject() {
  if (!AppState.selection) return null;
  const s = AppState.selection;
  if (s.type === "wall") return findById(AppState.plan.walls, s.id);
  if (s.type === "room") return findById(AppState.plan.rooms, s.id);
  if (s.type === "opening") return findById(AppState.plan.openings, s.id);
  if (s.type === "furniture") return findById(AppState.plan.furniture, s.id);
  return null;
}

function deleteSelected() {
  if (!AppState.selection) return;
  const s = AppState.selection;
  if (s.type === "wall") {
    AppState.plan.walls = AppState.plan.walls.filter(function (w) { return w.id !== s.id; });
    AppState.plan.openings = AppState.plan.openings.filter(function (o) { return o.wallId !== s.id; });
  } else if (s.type === "room") {
    AppState.plan.rooms = AppState.plan.rooms.filter(function (r) { return r.id !== s.id; });
  } else if (s.type === "opening") {
    AppState.plan.openings = AppState.plan.openings.filter(function (o) { return o.id !== s.id; });
  } else if (s.type === "furniture") {
    AppState.plan.furniture = AppState.plan.furniture.filter(function (f) { return f.id !== s.id; });
  }
  clearSelection();
  commitAction();
}

// Debounced notification hook to Flutter bridge; wired up in bridge.js.
let _notifyTimer = null;
function notifyChange() {
  if (typeof window.__onPlanChanged === "function") {
    if (_notifyTimer) clearTimeout(_notifyTimer);
    _notifyTimer = setTimeout(function () {
      window.__onPlanChanged();
    }, 500);
  }
  if (typeof window.__onPlanChangedImmediate === "function") {
    window.__onPlanChangedImmediate();
  }
}
