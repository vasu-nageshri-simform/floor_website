// Furniture palette: type defs, icons, placement.

const FURNITURE_TYPES = [
  { type: "bed", label: "Bed", wM: 1.6, hM: 2.0 },
  { type: "sofa", label: "Sofa", wM: 1.8, hM: 0.8 },
  { type: "table", label: "Table", wM: 1.2, hM: 0.75 },
  { type: "chair", label: "Chair", wM: 0.45, hM: 0.45 },
  { type: "wardrobe", label: "Wardrobe", wM: 1.2, hM: 0.6 },
  { type: "tv-unit", label: "TV Unit", wM: 1.2, hM: 0.4 },
  { type: "sink", label: "Sink", wM: 0.5, hM: 0.5 },
  { type: "toilet", label: "Toilet", wM: 0.4, hM: 0.6 },
  { type: "bathtub", label: "Bathtub", wM: 1.6, hM: 0.7 },
  { type: "plant", label: "Plant", wM: 0.4, hM: 0.4 }
];

function getFurnitureDef(type) {
  return FURNITURE_TYPES.find(function (f) { return f.type === type; });
}

// Builds the SVG icon (group of shapes) for a furniture instance, centered at origin,
// sized to w,h (px). Used both in canvas rendering and palette thumbnails.
function buildFurnitureIcon(type, w, h) {
  const g = svgEl("g", {});
  const hw = w / 2, hh = h / 2;
  const baseRect = svgEl("rect", {
    x: -hw, y: -hh, width: w, height: h,
    fill: "#e8edf3", stroke: "#5a6472", "stroke-width": 1.5, rx: 2
  });

  switch (type) {
    case "bed": {
      g.appendChild(baseRect);
      const pillowW = w * 0.35, pillowH = h * 0.18;
      g.appendChild(svgEl("rect", {
        x: -hw + w * 0.08, y: -hh + h * 0.06, width: pillowW, height: pillowH,
        fill: "#fff", stroke: "#5a6472", "stroke-width": 1, rx: 3
      }));
      g.appendChild(svgEl("rect", {
        x: hw - w * 0.08 - pillowW, y: -hh + h * 0.06, width: pillowW, height: pillowH,
        fill: "#fff", stroke: "#5a6472", "stroke-width": 1, rx: 3
      }));
      break;
    }
    case "sofa": {
      g.appendChild(baseRect);
      g.appendChild(svgEl("rect", {
        x: -hw, y: -hh, width: w, height: h * 0.22,
        fill: "#c9d3de", stroke: "#5a6472", "stroke-width": 1
      }));
      break;
    }
    case "table": {
      g.appendChild(baseRect);
      break;
    }
    case "chair": {
      g.appendChild(baseRect);
      g.appendChild(svgEl("path", {
        d: "M " + (-hw) + " " + (-hh) + " A " + hw + " " + (hh * 0.4) + " 0 0 1 " + hw + " " + (-hh),
        fill: "none", stroke: "#5a6472", "stroke-width": 1.5
      }));
      break;
    }
    case "wardrobe": {
      g.appendChild(baseRect);
      g.appendChild(svgEl("line", { x1: 0, y1: -hh, x2: 0, y2: hh, stroke: "#5a6472", "stroke-width": 1 }));
      break;
    }
    case "tv-unit": {
      g.appendChild(baseRect);
      break;
    }
    case "sink": {
      g.appendChild(baseRect);
      g.appendChild(svgEl("ellipse", {
        cx: 0, cy: 0, rx: hw * 0.7, ry: hh * 0.7,
        fill: "#fff", stroke: "#5a6472", "stroke-width": 1.5
      }));
      break;
    }
    case "toilet": {
      g.appendChild(svgEl("rect", {
        x: -hw * 0.6, y: -hh, width: w * 0.6, height: h * 0.25,
        fill: "#e8edf3", stroke: "#5a6472", "stroke-width": 1.5
      }));
      g.appendChild(svgEl("ellipse", {
        cx: 0, cy: h * 0.12, rx: hw * 0.8, ry: hh * 0.6,
        fill: "#fff", stroke: "#5a6472", "stroke-width": 1.5
      }));
      break;
    }
    case "bathtub": {
      g.appendChild(svgEl("rect", {
        x: -hw, y: -hh, width: w, height: h,
        fill: "#e8edf3", stroke: "#5a6472", "stroke-width": 1.5, rx: Math.min(hw, hh) * 0.6
      }));
      break;
    }
    case "plant": {
      g.appendChild(svgEl("circle", {
        cx: 0, cy: 0, r: Math.min(hw, hh),
        fill: "#cfe8cf", stroke: "#4f8a4f", "stroke-width": 1.5
      }));
      break;
    }
    default:
      g.appendChild(baseRect);
  }
  return g;
}

let armedFurnitureType = null;

function renderFurniturePalette() {
  const list = document.getElementById("palette-list");
  clearLayer(list);
  for (const def of FURNITURE_TYPES) {
    const item = document.createElement("div");
    item.className = "palette-item";
    item.dataset.type = def.type;

    const iconWrap = document.createElement("div");
    iconWrap.className = "icon";
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "-30 -30 60 60");
    const iconGroup = buildFurnitureIcon(def.type, metersToPx(def.wM) * 0.9, metersToPx(def.hM) * 0.9);
    // scale down to fit thumbnail
    const scale = Math.min(50 / metersToPx(def.wM), 50 / metersToPx(def.hM), 1);
    iconGroup.setAttribute("transform", "scale(" + scale + ")");
    svg.appendChild(iconGroup);
    iconWrap.appendChild(svg);

    const label = document.createElement("span");
    label.textContent = def.label;

    item.appendChild(iconWrap);
    item.appendChild(label);
    item.addEventListener("click", function () {
      armFurniturePlacement(def.type);
    });
    list.appendChild(item);
  }
}

function armFurniturePlacement(type) {
  armedFurnitureType = type;
  document.querySelectorAll(".palette-item").forEach(function (el) {
    el.classList.toggle("armed", el.dataset.type === type);
  });
  document.getElementById("canvas").classList.add("placement-armed");
  setHint("Click on canvas to place " + getFurnitureDef(type).label + ". Esc to cancel.");
}

function disarmFurniturePlacement() {
  armedFurnitureType = null;
  document.querySelectorAll(".palette-item").forEach(function (el) {
    el.classList.remove("armed");
  });
  document.getElementById("canvas").classList.remove("placement-armed");
  updateHintForTool();
}

function placeFurnitureAt(worldX, worldY) {
  if (!armedFurnitureType) return;
  const def = getFurnitureDef(armedFurnitureType);
  const item = {
    id: genId("f"),
    type: def.type,
    x: snapToGrid(worldX),
    y: snapToGrid(worldY),
    w: metersToPx(def.wM),
    h: metersToPx(def.hM),
    rotation: 0,
    label: def.label
  };
  AppState.plan.furniture.push(item);
  disarmFurniturePlacement();
  setActiveTool("select");
  setSelection("furniture", item.id);
  renderAll();
  renderProperties();
  commitAction();
}
