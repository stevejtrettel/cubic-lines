import { Point } from './point.js';
import { createPointEditor } from './editor.js';

const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];

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
  const points = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return new Point(Math.cos(a) * 0.8, Math.sin(a) * 0.8);
  });

  const { svg } = createPointEditor(container, points, {
    style: (i) => ({ fill: COLORS[i], stroke: '#333', 'stroke-width': '0.02' }),
    ...opts,
  });
  svg.style.background = '#e8e6e1';

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
