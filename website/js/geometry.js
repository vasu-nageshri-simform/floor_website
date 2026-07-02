// Geometry helpers: snapping, hit-testing, math.

const SNAP_INCREMENT = 15; // 0.25m in px
const ANGLE_SNAP_DEG = 15;

function snapToGrid(v) {
  return Math.round(v / SNAP_INCREMENT) * SNAP_INCREMENT;
}

function snapPoint(x, y) {
  return { x: snapToGrid(x), y: snapToGrid(y) };
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function toDeg(rad) { return rad * 180 / Math.PI; }
function toRad(deg) { return deg * Math.PI / 180; }

// Snap a point to angle increments relative to an origin.
function snapAngle(originX, originY, x, y, snapEnabled) {
  const dx = x - originX;
  const dy = y - originY;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return { x: x, y: y };
  let angle = Math.atan2(dy, dx);
  if (snapEnabled) {
    const snapRad = toRad(ANGLE_SNAP_DEG);
    angle = Math.round(angle / snapRad) * snapRad;
  }
  return {
    x: originX + Math.cos(angle) * dist,
    y: originY + Math.sin(angle) * dist
  };
}

function pxToMeters(px) { return px / PIXELS_PER_METER; }
function metersToPx(m) { return m * PIXELS_PER_METER; }

function fmtMeters(px, decimals) {
  decimals = decimals === undefined ? 2 : decimals;
  return pxToMeters(px).toFixed(decimals);
}

// Rotate a vector (dx,dy) by given degrees.
function rotateVec(dx, dy, deg) {
  const r = toRad(deg);
  const cos = Math.cos(r), sin = Math.sin(r);
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}

// Distance from point to segment, plus nearest point + t (0-1 fraction along segment).
function pointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const nx = x1 + t * dx;
  const ny = y1 + t * dy;
  return { dist: distance(px, py, nx, ny), x: nx, y: ny, t: t };
}

// Polygon centroid (assumes simple polygon).
function polygonCentroid(points) {
  let x = 0, y = 0;
  for (const p of points) { x += p.x; y += p.y; }
  return { x: x / points.length, y: y / points.length };
}

// Polygon area (shoelace, absolute value) in px^2.
function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

// Point-in-polygon (ray casting).
function pointInPolygon(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y;
    const xj = points[j].x, yj = points[j].y;
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Find nearest wall to a world point, within maxDist px. Returns {wall, t, point, dist} or null.
function findNearestWall(walls, px, py, maxDist) {
  let best = null;
  for (const w of walls) {
    const res = pointToSegment(px, py, w.x1, w.y1, w.x2, w.y2);
    if (res.dist <= maxDist && (!best || res.dist < best.dist)) {
      best = { wall: w, t: res.t, point: { x: res.x, y: res.y }, dist: res.dist };
    }
  }
  return best;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
