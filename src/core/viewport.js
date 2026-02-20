/**
 * A viewport is a container that stacks layers on top of each other.
 *
 * createViewport(parent) — creates a positioned div inside parent.
 *   .addCanvas()  — appends an absolutely-positioned canvas, returns it.
 *   .addOverlay() — appends an absolutely-positioned div, returns it.
 *   .el           — the container element itself.
 *
 * Layers stack in DOM order (first added = bottom).
 */

const LAYER = 'position:absolute;top:0;left:0;width:100%;height:100%;';

export function createViewport(parent) {
  const el = document.createElement('div');
  el.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;';
  if (parent) parent.appendChild(el);

  return {
    el,
    addCanvas() {
      const c = document.createElement('canvas');
      c.style.cssText = LAYER + 'display:block;';
      el.appendChild(c);
      return c;
    },
    addOverlay() {
      const d = document.createElement('div');
      d.style.cssText = LAYER + 'pointer-events:none;';
      el.appendChild(d);
      return d;
    },
  };
}
