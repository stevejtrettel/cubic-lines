/**
 * Six draggable points on an SVG overlay.
 *
 * Creates 6 reactive points in general position and an SVG editor
 * for dragging them. Returns { svg, coords, onChange }.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

class Point {
  constructor(x, y) {
    this._x = x;
    this._y = y;
    this._listeners = [];
  }
  get x() { return this._x; }
  get y() { return this._y; }
  moveTo(x, y) {
    this._x = x;
    this._y = y;
    for (const fn of this._listeners) fn(this);
  }
  onChange(fn) { this._listeners.push(fn); }
}

export function createSixPointEditor(container) {
  // General position: no 3 collinear, no 6 on a conic
  const points = [
    [-0.7, -0.5],
    [ 0.8, -0.3],
    [ 0.2,  0.9],
    [-0.4,  0.4],
    [ 0.5, -0.8],
    [-0.9,  0.1],
  ].map(([x, y]) => new Point(x, y));

  const viewBox = '-2 -2 4 4';
  const r = 0.08;
  const [vx, vy, vw, vh] = viewBox.split(' ').map(Number);

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.style.cssText = 'width:100%;height:100%;display:block;pointer-events:auto;';
  container.appendChild(svg);

  function svgPos(e) {
    const rect = svg.getBoundingClientRect();
    return {
      x: vx + ((e.clientX - rect.left) / rect.width) * vw,
      y: vy + ((e.clientY - rect.top) / rect.height) * vh,
    };
  }

  for (const p of points) {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', p.x);
    c.setAttribute('cy', p.y);
    c.setAttribute('r', r);
    c.setAttribute('fill', '#e74c3c');
    c.setAttribute('stroke', '#333');
    c.setAttribute('stroke-width', '0.02');
    c.style.cursor = 'grab';
    svg.appendChild(c);
    p.onChange(() => {
      c.setAttribute('cx', p.x);
      c.setAttribute('cy', p.y);
    });
  }

  let drag = null;
  svg.addEventListener('mousedown', (e) => {
    const pos = svgPos(e);
    for (let i = 0; i < points.length; i++) {
      const dx = points[i].x - pos.x, dy = points[i].y - pos.y;
      if (Math.sqrt(dx * dx + dy * dy) < r * 3) {
        drag = i;
        e.preventDefault();
        return;
      }
    }
  });
  window.addEventListener('mousemove', (e) => {
    if (drag === null) return;
    const pos = svgPos(e);
    points[drag].moveTo(pos.x, pos.y);
  });
  window.addEventListener('mouseup', () => { drag = null; });

  const listeners = [];
  function notify() { for (const fn of listeners) fn(); }
  points.forEach(p => p.onChange(notify));

  return {
    svg,
    coords() { return points.map(p => [p.x, p.y]); },
    onChange(fn) { listeners.push(fn); },
  };
}
