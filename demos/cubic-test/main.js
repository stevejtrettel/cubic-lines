import { createSplitView } from '../../src/core/split-view.js';
import { createEngine } from '../../src/core/engine.js';
import { createSixPointEditor } from '../../src/points/six-point-editor.js';
import { compute } from './compute.js';
import cubicSource from './cubic.glsl?raw';
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

// Right viewport: cubic surface + 27 lines
const engineCubic = createEngine(right.addCanvas(), cubicSource, {
  coefficients:   'vec4[5]',
  linePoints:     'vec4[27]',
  lineDirections: 'vec4[27]',
});

function update() {
  const { pts, conics, linePoints, lineDirections, cubicCoeffs } = compute(editor.coords());

  engineP2.setUniformValue('pts', pts);
  engineP2.setUniformValue('conics', conics);
  engineCubic.setUniformValue('linePoints', linePoints);
  engineCubic.setUniformValue('lineDirections', lineDirections);

  if (cubicCoeffs) {
    engineCubic.setUniformValue('coefficients', new Float32Array(cubicCoeffs));
  }
}

editor.onChange(update);
update();

engineCubic.start();
engineP2.start();
