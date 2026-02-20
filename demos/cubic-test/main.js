import { createSplitView } from '../../src/core/split-view.js';
import { createEngine } from '../../src/core/engine.js';
import { createSixPointEditor } from '../../src/points/six-point-editor.js';
import { compute } from './compute.js';
import linesSource from './lines.glsl?raw';
import p2Source from './p2.glsl?raw';

const app = document.getElementById('app');
const { left, right } = createSplitView(app);

// Left viewport: p2 shader behind, point editor on top
const engineP2 = createEngine(left.addCanvas(), p2Source, {
  pts:    'vec2[6]',
  conics: 'vec3[12]',
});
const editor = createSixPointEditor(left.addOverlay());
editor.svg.style.background = 'transparent';

// Right viewport: 3D line viewer
const engineLines = createEngine(right.addCanvas(), linesSource, {
  linePoints:     'vec4[21]',
  lineDirections: 'vec4[21]',
});

function update() {
  const { pts, conics, linePoints, lineDirections } = compute(editor.coords());

  engineP2.setUniformValue('pts', pts);
  engineP2.setUniformValue('conics', conics);
  engineLines.setUniformValue('linePoints', linePoints);
  engineLines.setUniformValue('lineDirections', lineDirections);
}

editor.onChange(update);
update();

engineLines.start();
engineP2.start();
