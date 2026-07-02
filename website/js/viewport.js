// Viewport: pan & zoom transform applied to #viewport group.

const ViewportState = {
  panX: 0,
  panY: 0,
  zoom: 1,
  panning: false,
  panStart: null,
  panOrigin: null
};

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 3;

function applyViewportTransform() {
  const g = document.getElementById("viewport");
  g.setAttribute("transform",
    "translate(" + ViewportState.panX + "," + ViewportState.panY + ") scale(" + ViewportState.zoom + ")");
}

function startPan(e) {
  ViewportState.panning = true;
  ViewportState.panStart = { x: e.clientX, y: e.clientY };
  ViewportState.panOrigin = { x: ViewportState.panX, y: ViewportState.panY };
  document.getElementById("canvas").classList.add("panning");
}

function updatePan(e) {
  if (!ViewportState.panning) return;
  const dx = e.clientX - ViewportState.panStart.x;
  const dy = e.clientY - ViewportState.panStart.y;
  ViewportState.panX = ViewportState.panOrigin.x + dx;
  ViewportState.panY = ViewportState.panOrigin.y + dy;
  applyViewportTransform();
}

function endPan(e) {
  ViewportState.panning = false;
  document.getElementById("canvas").classList.remove("panning");
}

function handleZoomWheel(e) {
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const cursorX = e.clientX - rect.left;
  const cursorY = e.clientY - rect.top;

  // world point under cursor before zoom
  const worldX = (cursorX - ViewportState.panX) / ViewportState.zoom;
  const worldY = (cursorY - ViewportState.panY) / ViewportState.zoom;

  const delta = -e.deltaY;
  const factor = Math.exp(delta * 0.001);
  let newZoom = ViewportState.zoom * factor;
  newZoom = clamp(newZoom, ZOOM_MIN, ZOOM_MAX);

  ViewportState.zoom = newZoom;
  // keep world point under cursor fixed
  ViewportState.panX = cursorX - worldX * newZoom;
  ViewportState.panY = cursorY - worldY * newZoom;
  applyViewportTransform();
}

function zoomBy(factor) {
  const canvas = document.getElementById("canvas");
  const rect = canvas.getBoundingClientRect();
  const cx = rect.width / 2, cy = rect.height / 2;
  const worldX = (cx - ViewportState.panX) / ViewportState.zoom;
  const worldY = (cy - ViewportState.panY) / ViewportState.zoom;
  let newZoom = clamp(ViewportState.zoom * factor, ZOOM_MIN, ZOOM_MAX);
  ViewportState.zoom = newZoom;
  ViewportState.panX = cx - worldX * newZoom;
  ViewportState.panY = cy - worldY * newZoom;
  applyViewportTransform();
}

function resetViewport() {
  ViewportState.panX = 0;
  ViewportState.panY = 0;
  ViewportState.zoom = 1;

  // fit to content if any exists
  const bounds = computePlanBounds();
  if (bounds) {
    const canvas = document.getElementById("canvas");
    const rect = canvas.getBoundingClientRect();
    const padding = 60;
    const contentW = bounds.maxX - bounds.minX || 1;
    const contentH = bounds.maxY - bounds.minY || 1;
    const scaleX = (rect.width - padding * 2) / contentW;
    const scaleY = (rect.height - padding * 2) / contentH;
    let zoom = Math.min(scaleX, scaleY);
    zoom = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    ViewportState.zoom = zoom;
    ViewportState.panX = rect.width / 2 - cx * zoom;
    ViewportState.panY = rect.height / 2 - cy * zoom;
  } else {
    const canvas = document.getElementById("canvas");
    const rect = canvas.getBoundingClientRect();
    ViewportState.panX = rect.width / 2;
    ViewportState.panY = rect.height / 2;
  }
  applyViewportTransform();
}

function computePlanBounds() {
  const plan = AppState.plan;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let found = false;

  for (const w of plan.walls) {
    minX = Math.min(minX, w.x1, w.x2); maxX = Math.max(maxX, w.x1, w.x2);
    minY = Math.min(minY, w.y1, w.y2); maxY = Math.max(maxY, w.y1, w.y2);
    found = true;
  }
  for (const r of plan.rooms) {
    for (const p of r.points) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      found = true;
    }
  }
  for (const f of plan.furniture) {
    minX = Math.min(minX, f.x - f.w / 2); maxX = Math.max(maxX, f.x + f.w / 2);
    minY = Math.min(minY, f.y - f.h / 2); maxY = Math.max(maxY, f.y + f.h / 2);
    found = true;
  }

  return found ? { minX: minX, minY: minY, maxX: maxX, maxY: maxY } : null;
}
