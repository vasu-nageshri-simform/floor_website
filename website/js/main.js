// Main: init wiring for toolbar, palette, viewport, tools.

function init() {
  renderFurniturePalette();
  initToolEvents();
  initToolbarEvents();
  setActiveTool("select");
  resetViewport();
  renderAll();
  renderProperties();
  commitAction(); // baseline snapshot so first undo has somewhere to land after
  AppState.undoStack = []; // clear baseline; nothing to undo until a real action happens
}

function initToolbarEvents() {
  document.querySelectorAll(".tool-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setActiveTool(btn.dataset.tool);
    });
  });

  document.getElementById("zoom-in-btn").addEventListener("click", function () { zoomBy(1.25); });
  document.getElementById("zoom-out-btn").addEventListener("click", function () { zoomBy(0.8); });
  document.getElementById("zoom-reset-btn").addEventListener("click", function () { resetViewport(); });

  document.getElementById("undo-btn").addEventListener("click", function () {
    undo(); renderAll(); renderProperties();
  });
  document.getElementById("redo-btn").addEventListener("click", function () {
    redo(); renderAll(); renderProperties();
  });

  document.getElementById("export-btn").addEventListener("click", exportPlanAsFile);

  const importInput = document.getElementById("import-file-input");
  document.getElementById("import-btn").addEventListener("click", function () {
    importInput.value = "";
    importInput.click();
  });
  importInput.addEventListener("change", function () {
    if (importInput.files && importInput.files[0]) {
      importPlanFromFile(importInput.files[0]);
    }
  });

  document.getElementById("clear-btn").addEventListener("click", function () {
    if (confirm("Clear the current plan? This cannot be undone.")) {
      window.FloorPlanner.clearPlan();
      resetViewport();
    }
  });

  const nameInput = document.getElementById("plan-name-input");
  nameInput.addEventListener("input", function () {
    AppState.plan.meta.name = nameInput.value;
  });
  nameInput.addEventListener("change", function () { commitAction(); });
}

window.addEventListener("DOMContentLoaded", init);
