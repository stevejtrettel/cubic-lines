import { createViewport } from './viewport.js';

/**
 * Creates a side-by-side split layout inside a container.
 * Returns { left, right } — two viewports.
 */
export function createSplitView(container = document.body) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;width:100%;height:100%;';

  const left = createViewport();
  left.el.style.flex = '1';
  left.el.style.minWidth = '0';

  const right = createViewport();
  right.el.style.flex = '1';
  right.el.style.minWidth = '0';

  wrapper.appendChild(left.el);
  wrapper.appendChild(right.el);
  container.appendChild(wrapper);

  return { left, right };
}
