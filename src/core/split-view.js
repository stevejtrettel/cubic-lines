import { createViewport } from './viewport.js';

/**
 * Creates a side-by-side split layout inside a container.
 * Returns { left, right } — two viewports.
 */
export function createSplitView(container) {
  container.style.cssText = 'display:flex;width:100%;height:100%;';

  const left = createViewport();
  left.el.style.flex = '1';
  left.el.style.minWidth = '0';

  const right = createViewport();
  right.el.style.flex = '1';
  right.el.style.minWidth = '0';

  container.appendChild(left.el);
  container.appendChild(right.el);

  return { left, right };
}
