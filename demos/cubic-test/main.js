import { createSplitView } from '../../src/core/split-view.js';
import { createEngine } from '../../src/core/engine.js';
import { createSixPointEditor } from '../../src/points/six-point-editor.js';
import { conicThroughFivePoints } from '../../src/math/conic.js';
import { compute } from './compute.js';
import shaderSource from './cubic.glsl?raw';
import p2Source from './p2.glsl?raw';
import config from './config.json';

const app = document.getElementById('app');
const { left, right } = createSplitView(app);

// Left viewport: p2 shader behind, point editor on top
const p2Uniforms = {
  pts: { type: 'vec2', count: 6 },
  conics: { type: 'vec3', count: 12 },
};
const { engine: engineP2, start: startP2 } = createEngine(left.addCanvas(), p2Source, p2Uniforms);
const editor = createSixPointEditor(left.addOverlay());
editor.svg.style.background = 'transparent';

// Right viewport: 3D surface raymarcher
const { engine, start } = createEngine(right.addCanvas(), shaderSource, config.uniforms);

function update() {
  const coords = editor.coords();

  // Send 6 points to p2 shader
  const flat = new Float32Array(12);
  for (let i = 0; i < 6; i++) {
    flat[i * 2] = coords[i][0];
    flat[i * 2 + 1] = coords[i][1];
  }
  engineP2.setUniformValue('pts', flat);

  // Compute 6 conics, each leaving out one point
  const homog = coords.map(([x, y]) => [x, y, 1]);
  const packed = new Float32Array(36); // 6 conics × 6 coefficients
  for (let skip = 0; skip < 6; skip++) {
    const five = homog.filter((_, i) => i !== skip);
    const c = conicThroughFivePoints(five);
    if (c) {
      for (let j = 0; j < 6; j++) packed[skip * 6 + j] = c[j];
    }
  }
  engineP2.setUniformValue('conics', packed);

  // Send computed surface data to raymarcher
  const { coefficients, linePoints, lineDirections } = compute(coords);
  engine.setUniformValue('coefficients', coefficients);
  engine.setUniformValue('linePoints', linePoints);
  engine.setUniformValue('lineDirections', lineDirections);
}

editor.onChange(update);
update();

start();
startP2();
