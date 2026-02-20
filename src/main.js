import { createEngine } from './engine.js';
import shaderSource from '../shaders/cubic-test/image.glsl?raw';
import config from '../shaders/cubic-test/config.json';
import * as script from '../shaders/cubic-test/script.js';
import './style.css';

const canvas = document.getElementById('canvas');
const overlay = document.getElementById('overlay');

const { engine, start } = createEngine(canvas, shaderSource, config.uniforms, overlay);

script.setup(engine);
start((eng, time, dt, frame) => script.onFrame(eng, time, dt, frame));
