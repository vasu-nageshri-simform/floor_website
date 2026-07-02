// Rendering: draws plan state into SVG layers. Pure DOM sync, no state mutation here.

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  if (attrs) {
    for (const k in attrs) el.setAttribute(k, attrs[k]);
  }
  return el;
}

function clearLayer(layer) {
  while (layer.firstChild) layer.removeChild(layer.firstChild);
}

function renderAll() {
  renderRooms();
  renderWalls();
  renderOpenings();
  renderFurniture();
  renderSelection();
}

// ---------- Rooms ----------
function renderRooms() {
  const layer = document.getElementById("layer-rooms");
  clearLayer(layer);
  for (const room of AppState.plan.rooms) {
    const pts = room.points.map(function (p) { return p.x + "," + p.y; }).join(" ");
    const poly = svgEl("polygon", {
      points: pts,
      fill: room.color || "#cfe8ff",
      "fill-opacity": "0.55",
      stroke: room.color || "#cfe8ff",
      "stroke-width": "1",
      class: "room-poly selectable",
      "data-type": "room",
      "data-id": room.id
    });
    layer.appendChild(poly);

    const c = polygonCentroid(room.points);
    const label = svgEl("text", {
      x: c.x, y: c.y,
      class: "room-label"
    });
    label.textContent = room.label || "";
    layer.appendChild(label);
  }
}

// ---------- Walls ----------
function renderWalls() {
  const layer = document.getElementById("layer-walls");
  clearLayer(layer);
  for (const wall of AppState.plan.walls) {
    const line = svgEl("line", {
      x1: wall.x1, y1: wall.y1, x2: wall.x2, y2: wall.y2,
      stroke: wall.color || "#3a4553",
      "stroke-width": wall.thickness || 12,
      class: "wall-line selectable",
      "data-type": "wall",
      "data-id": wall.id
    });
    layer.appendChild(line);
  }
}

// ---------- Openings ----------
function renderOpenings() {
  const layer = document.getElementById("layer-openings");
  clearLayer(layer);
  for (const opening of AppState.plan.openings) {
    const wall = findById(AppState.plan.walls, opening.wallId);
    if (!wall) continue;
    renderOneOpening(layer, wall, opening);
  }
}

function renderOneOpening(layer, wall, opening) {
  const dx = wall.x2 - wall.x1, dy = wall.y2 - wall.y1;
  const wallLen = Math.hypot(dx, dy) || 1;
  const ux = dx / wallLen, uy = dy / wallLen; // unit along wall
  const nx = -uy, ny = ux; // unit normal

  const cx = wall.x1 + ux * (opening.t * wallLen);
  const cy = wall.y1 + uy * (opening.t * wallLen);
  const halfW = (opening.width || 48) / 2;

  const p1 = { x: cx - ux * halfW, y: cy - uy * halfW };
  const p2 = { x: cx + ux * halfW, y: cy + uy * halfW };

  // Gap: cover the wall stroke with background-colored segment.
  const gap = svgEl("line", {
    x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
    stroke: "#fbfcfd",
    "stroke-width": (wall.thickness || 12) + 2,
    "stroke-linecap": "butt"
  });
  layer.appendChild(gap);

  const group = svgEl("g", {
    class: "selectable",
    "data-type": "opening",
    "data-id": opening.id
  });

  // invisible wide hit-area for easier selection/dragging
  const hitArea = svgEl("line", {
    x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
    stroke: "transparent",
    "stroke-width": Math.max(20, (wall.thickness || 12) + 10)
  });
  group.appendChild(hitArea);

  if (opening.type === "door") {
    const leaf = svgEl("line", {
      x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
      stroke: "#8a5a2b", "stroke-width": 3
    });
    group.appendChild(leaf);

    // swing arc from hinge side
    const hinge = opening.swing === "right" ? p2 : p1;
    const hingeOther = opening.swing === "right" ? p1 : p2;
    const swingDir = opening.swing === "right" ? -1 : 1;
    const doorEnd = {
      x: hinge.x + nx * halfW * 2 * swingDir,
      y: hinge.y + ny * halfW * 2 * swingDir
    };
    const doorLine = svgEl("line", {
      x1: hinge.x, y1: hinge.y, x2: doorEnd.x, y2: doorEnd.y,
      stroke: "#8a5a2b", "stroke-width": 2
    });
    group.appendChild(doorLine);

    const arc = svgEl("path", {
      d: "M " + hingeOther.x + " " + hingeOther.y +
        " A " + (halfW * 2) + " " + (halfW * 2) + " 0 0 " + (opening.swing === "right" ? 0 : 1) +
        " " + doorEnd.x + " " + doorEnd.y,
      fill: "none",
      stroke: "#8a5a2b",
      "stroke-width": 1,
      "stroke-dasharray": "3 2"
    });
    group.appendChild(arc);
  } else {
    // window: two parallel lines
    const offset = (wall.thickness || 12) / 4;
    const line1 = svgEl("line", {
      x1: p1.x + nx * offset, y1: p1.y + ny * offset,
      x2: p2.x + nx * offset, y2: p2.y + ny * offset,
      stroke: "#2b6fa8", "stroke-width": 2
    });
    const line2 = svgEl("line", {
      x1: p1.x - nx * offset, y1: p1.y - ny * offset,
      x2: p2.x - nx * offset, y2: p2.y - ny * offset,
      stroke: "#2b6fa8", "stroke-width": 2
    });
    group.appendChild(line1);
    group.appendChild(line2);
  }

  layer.appendChild(group);
}

// ---------- Furniture ----------
function renderFurniture() {
  const layer = document.getElementById("layer-furniture");
  clearLayer(layer);
  for (const item of AppState.plan.furniture) {
    const group = svgEl("g", {
      class: "furniture-group selectable",
      "data-type": "furniture",
      "data-id": item.id,
      transform: "translate(" + item.x + "," + item.y + ") rotate(" + (item.rotation || 0) + ")"
    });
    const icon = buildFurnitureIcon(item.type, item.w, item.h);
    group.appendChild(icon);

    const label = svgEl("text", {
      x: 0, y: item.h / 2 + 12,
      class: "furniture-label",
      transform: "rotate(" + (-(item.rotation || 0)) + ")"
    });
    label.textContent = item.label || "";
    group.appendChild(label);

    layer.appendChild(group);
  }
}

// ---------- Selection handles ----------
function renderSelection() {
  const layer = document.getElementById("layer-selection");
  clearLayer(layer);
  if (!AppState.selection) return;
  const s = AppState.selection;
  const obj = getSelectedObject();
  if (!obj) return;

  if (s.type === "furniture") renderFurnitureHandles(layer, obj);
  else if (s.type === "wall") renderWallHandles(layer, obj);
  else if (s.type === "room") renderRoomHandles(layer, obj);
  else if (s.type === "opening") renderOpeningHandle(layer, obj);
}

function renderFurnitureHandles(layer, item) {
  const g = svgEl("g", {
    transform: "translate(" + item.x + "," + item.y + ") rotate(" + (item.rotation || 0) + ")"
  });
  const hw = item.w / 2, hh = item.h / 2;

  g.appendChild(svgEl("rect", {
    x: -hw, y: -hh, width: item.w, height: item.h,
    class: "selection-outline"
  }));

  // resize handle bottom-right
  g.appendChild(svgEl("circle", {
    cx: hw, cy: hh, r: 6,
    class: "handle",
    "data-handle": "resize"
  }));

  // rotate handle above top edge
  const rotHandleY = -hh - 24;
  g.appendChild(svgEl("line", {
    x1: 0, y1: -hh, x2: 0, y2: rotHandleY,
    class: "handle-line"
  }));
  g.appendChild(svgEl("circle", {
    cx: 0, cy: rotHandleY, r: 6,
    class: "handle handle-rotate",
    "data-handle": "rotate"
  }));

  layer.appendChild(g);
}

function renderWallHandles(layer, wall) {
  layer.appendChild(svgEl("circle", {
    cx: wall.x1, cy: wall.y1, r: 7, class: "handle", "data-handle": "start"
  }));
  layer.appendChild(svgEl("circle", {
    cx: wall.x2, cy: wall.y2, r: 7, class: "handle", "data-handle": "end"
  }));
}

function renderRoomHandles(layer, room) {
  for (let i = 0; i < room.points.length; i++) {
    const p = room.points[i];
    layer.appendChild(svgEl("circle", {
      cx: p.x, cy: p.y, r: 7, class: "handle", "data-handle": "vertex", "data-index": i
    }));
  }
}

function renderOpeningHandle(layer, opening) {
  const wall = findById(AppState.plan.walls, opening.wallId);
  if (!wall) return;
  const dx = wall.x2 - wall.x1, dy = wall.y2 - wall.y1;
  const wallLen = Math.hypot(dx, dy) || 1;
  const ux = dx / wallLen, uy = dy / wallLen;
  const cx = wall.x1 + ux * (opening.t * wallLen);
  const cy = wall.y1 + uy * (opening.t * wallLen);
  layer.appendChild(svgEl("circle", {
    cx: cx, cy: cy, r: 8, class: "handle", "data-handle": "slide"
  }));
}

// Live dimension label (used while dragging wall/room).
function showLiveDim(worldX, worldY, text) {
  const layer = document.getElementById("layer-selection");
  let g = document.getElementById("live-dim-group");
  if (g) g.remove();
  g = svgEl("g", { id: "live-dim-group" });
  const bg = svgEl("rect", {
    x: worldX - 2, y: worldY - 14, width: text.length * 7 + 8, height: 18,
    class: "live-dim-bg"
  });
  const t = svgEl("text", { x: worldX + 2, y: worldY, class: "live-dim-label" });
  t.textContent = text;
  g.appendChild(bg);
  g.appendChild(t);
  layer.appendChild(g);
}

function clearLiveDim() {
  const g = document.getElementById("live-dim-group");
  if (g) g.remove();
}
