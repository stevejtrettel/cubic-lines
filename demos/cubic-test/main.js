import { createSplitView } from '../../src/core/split-view.js';
import { createEngine } from '../../src/core/engine.js';
import { createSixPointEditor } from '../../src/points/six-point-editor.js';
import { compute } from './compute.js';
import shaderSource from './surface-raymarcher.glsl?raw';
import p2Source from './p2.glsl?raw';
import config from './config.json';

const app = document.getElementById('app');
const { left, right } = createSplitView(app);

// Left viewport: p2 shader behind, point editor on top
const { start: startP2 } = createEngine(left.addCanvas(), p2Source, {});
const editor = createSixPointEditor(left.addOverlay());
editor.svg.style.background = 'transparent';

// Right viewport: 3D surface raymarcher
const { engine, start } = createEngine(right.addCanvas(), shaderSource, config.uniforms);

function update() {
  const { coefficients, linePoints, lineDirections } = compute(editor.coords());
  engine.setUniformValue('coefficients', coefficients);
  engine.setUniformValue('linePoints', linePoints);
  engine.setUniformValue('lineDirections', lineDirections);
}

editor.onChange(update);
update();

start();
startP2();
