// Flutter WebView bridge + JSON export/import. No localStorage/sessionStorage/IndexedDB.

window.FloorPlanner = {
  getPlan: function () {
    return JSON.stringify(AppState.plan);
  },
  loadPlan: function (jsonStr) {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!validatePlanShape(parsed)) {
        console.error("FloorPlanner.loadPlan: invalid plan shape");
        return false;
      }
      AppState.plan = normalizePlan(parsed);
      clearSelection();
      resetUndoHistory();
      renderAll();
      renderProperties();
      applyViewportTransform();
      return true;
    } catch (err) {
      console.error("FloorPlanner.loadPlan: invalid JSON", err);
      return false;
    }
  },
  clearPlan: function () {
    AppState.plan = emptyPlan();
    clearSelection();
    resetUndoHistory();
    renderAll();
    renderProperties();
    return true;
  },
  setTool: function (name) {
    const valid = ["select", "wall", "room", "door", "window", "pan"];
    if (valid.indexOf(name) === -1) return false;
    setActiveTool(name);
    return true;
  }
};

function validatePlanShape(obj) {
  return obj && typeof obj === "object" &&
    Array.isArray(obj.walls) && Array.isArray(obj.rooms) &&
    Array.isArray(obj.openings) && Array.isArray(obj.furniture);
}

function normalizePlan(obj) {
  const plan = emptyPlan();
  plan.meta = Object.assign(plan.meta, obj.meta || {});
  plan.walls = obj.walls || [];
  plan.rooms = obj.rooms || [];
  plan.openings = obj.openings || [];
  plan.furniture = obj.furniture || [];
  return plan;
}

// Notify Flutter (debounced ~500ms), only if the bridge channel exists.
window.__onPlanChanged = function () {
  if (window.FlutterBridge && typeof window.FlutterBridge.postMessage === "function") {
    window.FlutterBridge.postMessage(JSON.stringify(AppState.plan));
  }
};

// ---------- Export / Import (browser file APIs, no storage) ----------
function exportPlanAsFile() {
  const dataStr = JSON.stringify(AppState.plan, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "plan.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importPlanFromFile(file) {
  const reader = new FileReader();
  reader.onload = function () {
    try {
      const parsed = JSON.parse(reader.result);
      if (!validatePlanShape(parsed)) {
        alert("Invalid plan file: missing required arrays (walls/rooms/openings/furniture).");
        return;
      }
      AppState.plan = normalizePlan(parsed);
      clearSelection();
      resetUndoHistory();
      renderAll();
      renderProperties();
      document.getElementById("plan-name-input").value = AppState.plan.meta.name || "";
      resetViewport();
    } catch (err) {
      alert("Invalid JSON file: " + err.message);
    }
  };
  reader.onerror = function () {
    alert("Failed to read file.");
  };
  reader.readAsText(file);
}
