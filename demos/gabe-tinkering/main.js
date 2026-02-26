import { createSplitView } from '../../src/core/split-view.js';
import { createEngine } from '../../src/core/engine.js';
import { createSixPointEditor } from '../../src/cubic/six-point-editor.js';
import { compute } from '../../src/cubic/compute.js';

// Shared GLSL library
import cameraGLSL from '../../src/shaders/camera.glsl?raw';
import sdfGLSL from '../../src/shaders/sdf.glsl?raw';
import projLineGLSL from '../../src/shaders/projective-line.glsl?raw';
import shadingGLSL from '../../src/shaders/shading.glsl?raw';
import cubicSurfaceGLSL from '../../src/shaders/cubic-surface.glsl?raw';

// Demo-specific shaders
import cubicBody from './cubic.glsl?raw';
import p2Source from './p2.glsl?raw';

// Parameters that the shared GLSL library needs (defined before it).
// These must come before the library because sdf.glsl, shading.glsl,
// and cubic-surface.glsl all reference them.
const shaderConfig = `
#define BOX_SIZE        2.0
#define LIGHT_DIR       normalize(vec3(0.4, 1.0, 0.3))
#define STEP_SIZE       0.008
#define LINE_RADIUS     0.015
#define BOUNDARY_RADIUS 0.015
`;

const shaderLib = shaderConfig + cameraGLSL + sdfGLSL + projLineGLSL + shadingGLSL;

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
const engineCubic = createEngine(right.addCanvas(), shaderLib + cubicSurfaceGLSL + cubicBody, {
  coefficients:   'vec4[5]',
  linePoints:     'vec4[27]',
  lineDirections: 'vec4[27]',
  activeLineIndex: 'int', // <-- This keeps track of which point I'm dragging, so I can color the associated line green.
});

function update() {
  const { pts, conics, linePoints, lineDirections, cubicCoeffs } = compute(editor.coords());
  const activeIdx = editor.active();
  const lineIdx = activeIdx === null ? -1 : activeIdx + 21;
  engineP2.setUniformValue('pts', pts);
  engineP2.setUniformValue('conics', conics);
  engineCubic.setUniformValue('linePoints', linePoints);
  engineCubic.setUniformValue('lineDirections', lineDirections);
  engineCubic.setUniformValue('activeLineIndex' , lineIdx);

  if (cubicCoeffs) {
    engineCubic.setUniformValue('coefficients', new Float32Array(cubicCoeffs));
  }
}

editor.onChange(update);
update();

engineCubic.start();
engineP2.start();
