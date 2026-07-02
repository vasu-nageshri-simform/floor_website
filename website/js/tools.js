// Tools: select, wall, room, door, window, pan. Pointer event handling per active tool.

let activeTool = "select";
let shiftHeld = false;
let spaceHeld = false;

// In-progress draw state
let drawState = null; // wall chain: { points: [{x,y}], previewEnd: {x,y} }
let roomDrawState = null; // { points: [{x,y}], previewEnd: {x,y} }

// Drag state for select tool
let dragState = null;

const TOOL_HINTS = {
  select: "Click to select. Drag to move. Delete to remove.",
  wall: "Click to start/continue wall. Enter/dbl-click/Esc to finish.",
  room: "Click to add vertex. Dbl-click/Enter to close room. Esc to cancel.",
  door: "Click near a wall to place a door.",
  window: "Click near a wall to place a window.",
  pan: "Drag to pan the view."
};

function setHint(text) {
  document.getElementById("hint-bar").textContent = text;
}

function updateHintForTool() {
  setHint(TOOL_HINTS[activeTool] || "");
}

function setActiveTool(tool) {
  // cancel any in-progress draw when switching tools
  cancelInProgressDraw();
  disarmFurniturePlacement();
  activeTool = tool;
  document.querySelectorAll(".tool-btn").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.tool === tool);
  });
  const canvas = document.getElementById("canvas");
  canvas.classList.remove("tool-select", "tool-wall", "tool-room", "tool-door", "tool-window", "tool-pan");
  canvas.classList.add("tool-" + tool);
  updateHintForTool();
}

function cancelInProgressDraw() {
  if (drawState) {
    drawState = null;
    clearLayer(document.getElementById("layer-draw-preview"));
  }
  if (roomDrawState) {
    roomDrawState = null;
    clearLayer(document.getElementById("layer-draw-preview"));
  }
}

// ---------- Coordinate conversion ----------
function screenToWorld(clientX, clientY) {
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const sx = clientX - rect.left;
  const sy = clientY - rect.top;
  return {
    x: (sx - ViewportState.panX) / ViewportState.zoom,
    y: (sy - ViewportState.panY) / ViewportState.zoom
  };
}

// ---------- Pointer event wiring ----------
function initToolEvents() {
  const canvas = document.getElementById("canvas");

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("dblclick", onDblClick);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
}

function getEventTarget(e) {
  const el = e.target.closest("[data-type]");
  if (!el) return null;
  return { type: el.getAttribute("data-type"), id: el.getAttribute("data-id"), el: el };
}

function getHandleTarget(e) {
  const el = e.target.closest("[data-handle]");
  if (!el) return null;
  return { handle: el.getAttribute("data-handle"), index: el.getAttribute("data-index"), el: el };
}

// ---------- Pointer down ----------
function onPointerDown(e) {
  if (e.button === 2) return; // ignore right click
  const world = screenToWorld(e.clientX, e.clientY);
  const isMiddle = e.button === 1;

  if (isMiddle || activeTool === "pan" || spaceHeld) {
    startPan(e);
    return;
  }

  if (armedFurnitureType) {
    placeFurnitureAt(world.x, world.y);
    return;
  }

  if (activeTool === "select") {
    handleSelectPointerDown(e, world);
  } else if (activeTool === "wall") {
    handleWallPointerDown(e, world);
  } else if (activeTool === "room") {
    handleRoomPointerDown(e, world);
  } else if (activeTool === "door") {
    handleOpeningPlacement(world, "door");
  } else if (activeTool === "window") {
    handleOpeningPlacement(world, "window");
  }
}

function onPointerMove(e) {
  const world = screenToWorld(e.clientX, e.clientY);

  if (ViewportState.panning) {
    updatePan(e);
    return;
  }

  if (activeTool === "wall" && drawState) {
    updateWallPreview(world, e.shiftKey);
  } else if (activeTool === "room" && roomDrawState) {
    updateRoomPreview(world);
  } else if (dragState) {
    updateDrag(world, e);
  }
}

function onPointerUp(e) {
  if (ViewportState.panning) {
    endPan(e);
    return;
  }
  if (dragState) {
    endDrag();
  }
}

function onDblClick(e) {
  if (activeTool === "wall" && drawState) {
    finishWallChain();
  } else if (activeTool === "room" && roomDrawState) {
    finishRoomDraw();
  }
}

function onWheel(e) {
  e.preventDefault();
  handleZoomWheel(e);
}

function onKeyDown(e) {
  if (e.key === "Shift") shiftHeld = true;
  if (e.code === "Space" && !spaceHeld) {
    spaceHeld = true;
    document.getElementById("canvas").classList.add("tool-pan");
  }

  // don't hijack typing in inputs
  const tag = document.activeElement.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;

  if (e.key === "Escape") {
    if (drawState || roomDrawState) {
      cancelInProgressDraw();
    } else if (armedFurnitureType) {
      disarmFurniturePlacement();
    } else {
      clearSelection();
      renderAll();
      renderProperties();
    }
    return;
  }

  if (e.key === "Enter") {
    if (drawState) finishWallChain();
    else if (roomDrawState) finishRoomDraw();
    return;
  }

  if ((e.key === "Delete" || e.key === "Backspace") && AppState.selection) {
    e.preventDefault();
    deleteSelected();
    renderAll();
    renderProperties();
    return;
  }

  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    if (e.shiftKey) { redo(); } else { undo(); }
    renderAll();
    renderProperties();
    return;
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
    e.preventDefault();
    redo();
    renderAll();
    renderProperties();
    return;
  }

  const keyToolMap = { v: "select", w: "wall", r: "room", d: "door", n: "window", h: "pan" };
  const lower = e.key.toLowerCase();
  if (keyToolMap[lower] && !e.metaKey && !e.ctrlKey) {
    setActiveTool(keyToolMap[lower]);
  }
}

function onKeyUp(e) {
  if (e.key === "Shift") shiftHeld = false;
  if (e.code === "Space") {
    spaceHeld = false;
    if (activeTool !== "pan") document.getElementById("canvas").classList.remove("tool-pan");
  }
}

// ---------- Wall tool ----------
function handleWallPointerDown(e, world) {
  const snapped = snapPoint(world.x, world.y);
  if (!drawState) {
    drawState = { points: [snapped] };
  } else {
    const last = drawState.points[drawState.points.length - 1];
    const angled = snapAngle(last.x, last.y, snapped.x, snapped.y, !e.shiftKey);
    const finalPt = snapPoint(angled.x, angled.y);
    drawState.points.push(finalPt);

    const wall = {
      id: genId("w"),
      x1: last.x, y1: last.y, x2: finalPt.x, y2: finalPt.y,
      thickness: 12
    };
    AppState.plan.walls.push(wall);
    renderAll();
    commitAction();
  }
}

function updateWallPreview(world, shiftKey) {
  const layer = document.getElementById("layer-draw-preview");
  clearLayer(layer);
  if (!drawState) return;
  const last = drawState.points[drawState.points.length - 1];
  const snapped = snapPoint(world.x, world.y);
  const angled = snapAngle(last.x, last.y, snapped.x, snapped.y, !shiftKey);
  const finalPt = snapPoint(angled.x, angled.y);

  layer.appendChild(svgEl("line", {
    x1: last.x, y1: last.y, x2: finalPt.x, y2: finalPt.y,
    stroke: "#3d7eff", "stroke-width": 12, "stroke-opacity": "0.5"
  }));

  const len = distance(last.x, last.y, finalPt.x, finalPt.y);
  const midX = (last.x + finalPt.x) / 2, midY = (last.y + finalPt.y) / 2;
  showLiveDim(midX, midY, fmtMeters(len) + " m");
}

function finishWallChain() {
  cancelInProgressDraw();
}

// ---------- Room tool ----------
function handleRoomPointerDown(e, world) {
  const snapped = snapPoint(world.x, world.y);
  if (!roomDrawState) {
    roomDrawState = { points: [snapped] };
  } else {
    const first = roomDrawState.points[0];
    if (roomDrawState.points.length >= 2 && distance(snapped.x, snapped.y, first.x, first.y) < 12) {
      finishRoomDraw();
      return;
    }
    roomDrawState.points.push(snapped);
  }
  updateRoomPreview(snapped);
}

function updateRoomPreview(world) {
  const layer = document.getElementById("layer-draw-preview");
  clearLayer(layer);
  if (!roomDrawState) return;
  const snapped = snapPoint(world.x, world.y);
  const pts = roomDrawState.points.concat([snapped]);
  const pointsStr = pts.map(function (p) { return p.x + "," + p.y; }).join(" ");

  layer.appendChild(svgEl("polygon", {
    points: pointsStr,
    fill: "#3d7eff", "fill-opacity": "0.2",
    stroke: "#3d7eff", "stroke-width": "1.5", "stroke-dasharray": "4 3"
  }));

  for (const p of roomDrawState.points) {
    layer.appendChild(svgEl("circle", { cx: p.x, cy: p.y, r: 4, fill: "#3d7eff" }));
  }

  if (pts.length >= 3) {
    const areaM2 = polygonArea(pts) / (PIXELS_PER_METER * PIXELS_PER_METER);
    const c = polygonCentroid(pts);
    showLiveDim(c.x, c.y, areaM2.toFixed(2) + " m²");
  }
}

function finishRoomDraw() {
  if (roomDrawState && roomDrawState.points.length >= 3) {
    const room = {
      id: genId("r"),
      label: "Room",
      color: "#cfe8ff",
      points: roomDrawState.points
    };
    AppState.plan.rooms.push(room);
    roomDrawState = null;
    clearLayer(document.getElementById("layer-draw-preview"));
    renderAll();
    commitAction();
  } else {
    cancelInProgressDraw();
  }
}

// ---------- Door / Window tool ----------
function handleOpeningPlacement(world, type) {
  const nearest = findNearestWall(AppState.plan.walls, world.x, world.y, 40);
  if (!nearest) return;
  const opening = {
    id: genId("o"),
    wallId: nearest.wall.id,
    type: type,
    t: nearest.t,
    width: type === "door" ? 48 : 60,
    swing: "left"
  };
  AppState.plan.openings.push(opening);
  renderAll();
  setActiveTool("select");
  setSelection("opening", opening.id);
  renderProperties();
  commitAction();
}

// ---------- Select tool: click + drag ----------
function handleSelectPointerDown(e, world) {
  const handleTarget = getHandleTarget(e);
  const objTarget = getEventTarget(e);

  if (handleTarget && AppState.selection) {
    startHandleDrag(handleTarget, world);
    return;
  }

  if (objTarget) {
    setSelection(objTarget.type, objTarget.id);
    renderAll();
    renderProperties();
    startBodyDrag(objTarget, world);
    return;
  }

  clearSelection();
  renderAll();
  renderProperties();
}

function startBodyDrag(target, world) {
  const obj = getSelectedObject();
  if (!obj) return;
  if (target.type === "furniture") {
    dragState = { mode: "move-furniture", startWorld: world, orig: { x: obj.x, y: obj.y } };
  } else if (target.type === "wall") {
    dragState = {
      mode: "move-wall", startWorld: world,
      orig: { x1: obj.x1, y1: obj.y1, x2: obj.x2, y2: obj.y2 }
    };
  } else if (target.type === "room") {
    dragState = {
      mode: "move-room", startWorld: world,
      orig: obj.points.map(function (p) { return { x: p.x, y: p.y }; })
    };
  } else if (target.type === "opening") {
    dragState = { mode: "slide-opening" };
  }
}

function startHandleDrag(target, world) {
  const obj = getSelectedObject();
  if (!obj) return;
  const s = AppState.selection;
  if (s.type === "furniture") {
    if (target.handle === "resize") {
      dragState = { mode: "resize-furniture", orig: { w: obj.w, h: obj.h } };
    } else if (target.handle === "rotate") {
      dragState = { mode: "rotate-furniture" };
    }
  } else if (s.type === "wall") {
    dragState = { mode: "wall-endpoint", handle: target.handle };
  } else if (s.type === "room") {
    dragState = { mode: "room-vertex", index: parseInt(target.index, 10) };
  } else if (s.type === "opening") {
    dragState = { mode: "slide-opening" };
  }
}

function updateDrag(world, e) {
  const obj = getSelectedObject();
  if (!obj || !dragState) return;

  switch (dragState.mode) {
    case "move-furniture": {
      const dx = world.x - dragState.startWorld.x;
      const dy = world.y - dragState.startWorld.y;
      obj.x = snapToGrid(dragState.orig.x + dx);
      obj.y = snapToGrid(dragState.orig.y + dy);
      break;
    }
    case "resize-furniture": {
      // resize math done in local unrotated frame
      const center = { x: obj.x, y: obj.y };
      const worldDx = world.x - center.x;
      const worldDy = world.y - center.y;
      const local = rotateVec(worldDx, worldDy, -(obj.rotation || 0));
      obj.w = Math.max(10, snapToGrid(local.x * 2));
      obj.h = Math.max(10, snapToGrid(local.y * 2));
      break;
    }
    case "rotate-furniture": {
      const dx = world.x - obj.x, dy = world.y - obj.y;
      let deg = toDeg(Math.atan2(dy, dx)) + 90;
      if (!e.shiftKey) deg = Math.round(deg / 15) * 15;
      obj.rotation = deg;
      break;
    }
    case "move-wall": {
      const dx = world.x - dragState.startWorld.x;
      const dy = world.y - dragState.startWorld.y;
      obj.x1 = snapToGrid(dragState.orig.x1 + dx);
      obj.y1 = snapToGrid(dragState.orig.y1 + dy);
      obj.x2 = snapToGrid(dragState.orig.x2 + dx);
      obj.y2 = snapToGrid(dragState.orig.y2 + dy);
      const len = distance(obj.x1, obj.y1, obj.x2, obj.y2);
      const mx = (obj.x1 + obj.x2) / 2, my = (obj.y1 + obj.y2) / 2;
      showLiveDim(mx, my, fmtMeters(len) + " m");
      break;
    }
    case "wall-endpoint": {
      const snapped = snapPoint(world.x, world.y);
      if (dragState.handle === "start") { obj.x1 = snapped.x; obj.y1 = snapped.y; }
      else { obj.x2 = snapped.x; obj.y2 = snapped.y; }
      const len = distance(obj.x1, obj.y1, obj.x2, obj.y2);
      const mx = (obj.x1 + obj.x2) / 2, my = (obj.y1 + obj.y2) / 2;
      showLiveDim(mx, my, fmtMeters(len) + " m");
      break;
    }
    case "move-room": {
      const dx = world.x - dragState.startWorld.x;
      const dy = world.y - dragState.startWorld.y;
      obj.points = dragState.orig.map(function (p) {
        return { x: snapToGrid(p.x + dx), y: snapToGrid(p.y + dy) };
      });
      const areaM2 = polygonArea(obj.points) / (PIXELS_PER_METER * PIXELS_PER_METER);
      const c = polygonCentroid(obj.points);
      showLiveDim(c.x, c.y, areaM2.toFixed(2) + " m²");
      break;
    }
    case "room-vertex": {
      const snapped = snapPoint(world.x, world.y);
      obj.points[dragState.index] = snapped;
      const areaM2 = polygonArea(obj.points) / (PIXELS_PER_METER * PIXELS_PER_METER);
      const c = polygonCentroid(obj.points);
      showLiveDim(c.x, c.y, areaM2.toFixed(2) + " m²");
      break;
    }
    case "slide-opening": {
      const wall = findById(AppState.plan.walls, obj.wallId);
      if (!wall) break;
      const res = pointToSegment(world.x, world.y, wall.x1, wall.y1, wall.x2, wall.y2);
      obj.t = clamp(res.t, 0, 1);
      break;
    }
  }
  renderAll();
  renderSelectionOnly();
}

// Re-render just selection layer to keep handles synced during drag without full re-render cost.
function renderSelectionOnly() {
  renderSelection();
}

function endDrag() {
  if (dragState) {
    dragState = null;
    clearLiveDim();
    renderAll();
    renderProperties();
    commitAction();
  }
}
