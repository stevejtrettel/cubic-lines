import { Point } from '../points/point.js';
import { createPointEditor } from '../points/editor.js';

/**
 * A ready-to-use editor with 6 draggable points.
 *
 * Returns { points, svg, onChange } where:
 *   points   — array of 6 Point instances
 *   svg      — the SVG element
 *   onChange  — register a callback: onChange(fn) where fn(points) is called on any drag
 *   coords() — returns [[x,y], [x,y], ...] for all 6 points
 */
export function createSixPointEditor(container, opts = {}) {
  // Generic position — no 3 collinear, no 6 on a conic
  const DEFAULTS = [
    [-0.7, -0.5],
    [ 0.8, -0.3],
    [ 0.2,  0.9],
    [-0.4,  0.4],
    [ 0.5, -0.8],
    [-0.9,  0.1],
  ];
  const points = DEFAULTS.map(([x, y]) => new Point(x, y));

  const { svg } = createPointEditor(container, points, {
    style: () => ({ fill: '#e74c3c', stroke: '#333', 'stroke-width': '0.02' }),
    ...opts,
  });
  const listeners = [];

  function notify() {
    for (const fn of listeners) fn(points);
  }
  points.forEach(p => p.onChange(notify));

  return {
    points,
    svg,
    onChange(fn) { listeners.push(fn); },
    coords() { return points.map(p => [p.x, p.y]); },
  };
}
