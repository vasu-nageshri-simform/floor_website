// Properties panel: reflects current selection, allows direct editing.

function renderProperties() {
  const content = document.getElementById("properties-content");
  clearLayer(content);
  const obj = getSelectedObject();
  if (!obj || !AppState.selection) {
    const p = document.createElement("p");
    p.className = "empty-msg";
    p.textContent = "Nothing selected.";
    content.appendChild(p);
    return;
  }

  const type = AppState.selection.type;
  if (type === "furniture") renderFurnitureProps(content, obj);
  else if (type === "wall") renderWallProps(content, obj);
  else if (type === "room") renderRoomProps(content, obj);
  else if (type === "opening") renderOpeningProps(content, obj);
}

function propRow(labelText, inputEl) {
  const row = document.createElement("div");
  row.className = "prop-row";
  const label = document.createElement("label");
  label.textContent = labelText;
  row.appendChild(label);
  row.appendChild(inputEl);
  return row;
}

function deleteButton() {
  const btn = document.createElement("button");
  btn.className = "prop-delete-btn";
  btn.textContent = "Delete";
  btn.addEventListener("click", function () {
    deleteSelected();
    renderAll();
    renderProperties();
  });
  return btn;
}

function renderFurnitureProps(content, item) {
  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.value = item.label || "";
  labelInput.addEventListener("input", function () {
    item.label = labelInput.value;
    renderAll();
  });
  labelInput.addEventListener("change", function () { commitAction(); });
  content.appendChild(propRow("Label", labelInput));

  const wInput = document.createElement("input");
  wInput.type = "number"; wInput.step = "0.01"; wInput.min = "0.05";
  wInput.value = pxToMeters(item.w).toFixed(2);
  wInput.addEventListener("input", function () {
    const v = parseFloat(wInput.value);
    if (!isNaN(v) && v > 0) { item.w = metersToPx(v); renderAll(); }
  });
  wInput.addEventListener("change", function () { commitAction(); });
  content.appendChild(propRow("Width (m)", wInput));

  const hInput = document.createElement("input");
  hInput.type = "number"; hInput.step = "0.01"; hInput.min = "0.05";
  hInput.value = pxToMeters(item.h).toFixed(2);
  hInput.addEventListener("input", function () {
    const v = parseFloat(hInput.value);
    if (!isNaN(v) && v > 0) { item.h = metersToPx(v); renderAll(); }
  });
  hInput.addEventListener("change", function () { commitAction(); });
  content.appendChild(propRow("Height (m)", hInput));

  const rotInput = document.createElement("input");
  rotInput.type = "number"; rotInput.step = "1";
  rotInput.value = Math.round(item.rotation || 0);
  rotInput.addEventListener("input", function () {
    const v = parseFloat(rotInput.value);
    if (!isNaN(v)) { item.rotation = v; renderAll(); }
  });
  rotInput.addEventListener("change", function () { commitAction(); });
  content.appendChild(propRow("Rotation (deg)", rotInput));

  content.appendChild(deleteButton());
}

function renderWallProps(content, wall) {
  const lenDiv = document.createElement("div");
  lenDiv.className = "readonly-val";
  lenDiv.textContent = fmtMeters(distance(wall.x1, wall.y1, wall.x2, wall.y2)) + " m";
  content.appendChild(propRow("Length", lenDiv));

  const thickInput = document.createElement("input");
  thickInput.type = "number"; thickInput.step = "0.01"; thickInput.min = "0.02";
  thickInput.value = pxToMeters(wall.thickness).toFixed(2);
  thickInput.addEventListener("input", function () {
    const v = parseFloat(thickInput.value);
    if (!isNaN(v) && v > 0) { wall.thickness = metersToPx(v); renderAll(); }
  });
  thickInput.addEventListener("change", function () { commitAction(); });
  content.appendChild(propRow("Thickness (m)", thickInput));

  content.appendChild(deleteButton());
}

function renderRoomProps(content, room) {
  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.value = room.label || "";
  labelInput.addEventListener("input", function () {
    room.label = labelInput.value;
    renderAll();
  });
  labelInput.addEventListener("change", function () { commitAction(); });
  content.appendChild(propRow("Label", labelInput));

  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = room.color || "#cfe8ff";
  colorInput.addEventListener("input", function () {
    room.color = colorInput.value;
    renderAll();
  });
  colorInput.addEventListener("change", function () { commitAction(); });
  content.appendChild(propRow("Color", colorInput));

  const areaDiv = document.createElement("div");
  areaDiv.className = "readonly-val";
  const areaM2 = polygonArea(room.points) / (PIXELS_PER_METER * PIXELS_PER_METER);
  areaDiv.textContent = areaM2.toFixed(2) + " m²";
  content.appendChild(propRow("Area", areaDiv));

  content.appendChild(deleteButton());
}

function renderOpeningProps(content, opening) {
  const typeDiv = document.createElement("div");
  typeDiv.className = "readonly-val";
  typeDiv.textContent = opening.type;
  content.appendChild(propRow("Type", typeDiv));

  const widthInput = document.createElement("input");
  widthInput.type = "number"; widthInput.step = "0.01"; widthInput.min = "0.1";
  widthInput.value = pxToMeters(opening.width).toFixed(2);
  widthInput.addEventListener("input", function () {
    const v = parseFloat(widthInput.value);
    if (!isNaN(v) && v > 0) { opening.width = metersToPx(v); renderAll(); }
  });
  widthInput.addEventListener("change", function () { commitAction(); });
  content.appendChild(propRow("Width (m)", widthInput));

  content.appendChild(deleteButton());
}
