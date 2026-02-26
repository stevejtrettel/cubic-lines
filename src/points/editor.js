/**
 * Draggable points on an SVG.
 *
 * createPointEditor(container, points, opts)
 *   points — array of Point instances (mutated on drag via moveTo)
 *   opts.viewBox — SVG viewBox string (default "-2 -2 4 4")
 *   opts.radius  — grab/display radius in SVG units (default 0.08)
 *   opts.style   — (index, point) => attribute object for each circle
 *   
 * Returns { svg, els } where els[i] is the <circle> for points[i].
 */

const SVG = 'http://www.w3.org/2000/svg';

export function createPointEditor(container, points, opts = {}) {
  const viewBox = opts.viewBox || '-2 -2 4 4';
  const r = opts.radius || 0.08;
  const styleFn = opts.style || (() => ({}));
  const dragStyleFn = opts.dragStyle || (() => ({}));
  const [vx, vy, vw, vh] = viewBox.split(' ').map(Number);

  const svg = document.createElementNS(SVG, 'svg');
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

  const els = points.map((p, i) => {
    const c = document.createElementNS(SVG, 'circle');
    c.setAttribute('cx', p.x);
    c.setAttribute('cy', p.y);
    c.setAttribute('r', r);
    c.style.cursor = 'grab';
    const attrs = styleFn(i, p);
    for (const [k, v] of Object.entries(attrs)) c.setAttribute(k, v);
    svg.appendChild(c);

    // Keep circle in sync if point is moved programmatically
    p.onChange(() => {
      c.setAttribute('cx', p.x);
      c.setAttribute('cy', p.y);
    });

    return c;
  });

  // Drag
  let drag = null;

  svg.addEventListener('mousedown', (e) => {
    const pos = svgPos(e);
    for (let i = 0; i < points.length; i++) {
      const dx = points[i].x - pos.x, dy = points[i].y - pos.y;
      if (Math.sqrt(dx * dx + dy * dy) < r * 3) {
        drag = i;
        const attrs = dragStyleFn();
        for (const [k,v] of Object.entries(attrs)) els[i].setAttribute(k,v);
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

  window.addEventListener('mouseup', () => { 
    if (drag!=null){
      const attrs = styleFn();
      for (const [k,v] of Object.entries(attrs)) els[drag].setAttribute(k,v);
    }
    drag = null;
  });

  return { svg, els };
}
