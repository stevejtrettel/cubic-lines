import { createViewport } from '../../src/core/viewport.js';
import { createEngine } from '../../src/core/engine.js';
import { parseScene2d } from './parse-scene2d.js';

import p2Source from '../new-build/p2.glsl?raw';

const viewport = createViewport(document.body);
const canvas = viewport.addCanvas();

const engine = createEngine(canvas, p2Source, {
  pts:    'vec2[6]',
  conics: 'vec3[12]',
});

function loadScene(source) {
  const { pts, conics } = parseScene2d(source);
  engine.setUniformValue('pts', pts);
  engine.setUniformValue('conics', conics);
}

// File picker button
const btn = document.createElement('button');
btn.textContent = 'Load scene2d.glsl';
Object.assign(btn.style, {
  position: 'fixed', top: '12px', right: '12px', zIndex: '1000',
  padding: '6px 14px', cursor: 'pointer',
  background: '#222', color: '#eee', border: '1px solid #555',
  borderRadius: '4px', fontSize: '13px',
});

const input = document.createElement('input');
input.type = 'file';
input.accept = '.glsl';
input.style.display = 'none';

input.onchange = async () => {
  const file = input.files[0];
  if (!file) return;
  const text = await file.text();
  loadScene(text);
};

btn.onclick = () => input.click();
document.body.appendChild(btn);
document.body.appendChild(input);

engine.start();
