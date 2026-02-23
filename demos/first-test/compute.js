/**
 * Compute the 27 lines on a cubic surface and pack for shaders.
 */

import { formsVanishingAt, evaluateForm, formGradient,
         conicThroughFivePoints, conicOtherIntersection } from './math.js';

// ==================== Cubic map ====================

// 4-dimensional basis of cubics vanishing at 6 points (the map P2 -> P3).
function cubicMap(pts) {
  const basis = formsVanishingAt(pts, 3);
  if (basis.length < 4) return null;
  return basis.slice(0, 4);
}

// Evaluate the cubic map at a point: [f0(p), f1(p), f2(p), f3(p)].
function evaluateMap(basis, point) {
  return basis.map(coeffs => evaluateForm(coeffs, point, 3));
}

// Directional derivative J(point) * direction (for exceptional lines).
function evaluateMapDerivative(basis, point, direction) {
  return basis.map(coeffs => {
    const g = formGradient(coeffs, point, 3);
    let dot = 0;
    for (let i = 0; i < g.length; i++) dot += g[i] * direction[i];
    return dot;
  });
}

// ==================== The 27 lines ====================

function twentySevenLines(pts) {
  // 6 conics, each through 5 of the 6 points
  const conics = [];
  for (let skip = 0; skip < 6; skip++) {
    const five = pts.filter((_, i) => i !== skip);
    conics.push(conicThroughFivePoints(five));
  }

  const basis = cubicMap(pts);
  if (!basis) return null;

  const lines = [];
  const p3Samples = [];

  // 15 pair lines: sample at t=1/3 and t=2/3 along each base-point pair
  for (let i = 0; i < 6; i++) {
    for (let j = i + 1; j < 6; j++) {
      const a = pts[i], b = pts[j];
      const m1 = a.map((v, k) => (2 * v + b[k]) / 3);
      const m2 = a.map((v, k) => (v + 2 * b[k]) / 3);
      const p3a = evaluateMap(basis, m1);
      const p3b = evaluateMap(basis, m2);
      p3Samples.push(p3a, p3b);
      lines.push([p3a, p3b]);
    }
  }

  // Implicitize: find the cubic in P3 vanishing on S (30 sample points, 20 monomials)
  let implicitCoeffs = null;
  const implicitBasis = formsVanishingAt(p3Samples, 3);
  if (implicitBasis.length > 0) {
    implicitCoeffs = implicitBasis[0];
  }

  // 6 conic lines: push base points along each conic to find non-base points
  for (let skip = 0; skip < 6; skip++) {
    const c = conics[skip];
    if (!c) { lines.push(null); continue; }

    const known = pts.filter((_, i) => i !== skip);
    const v = pts[skip];

    const newPt1 = conicOtherIntersection(c, known[0], v);
    const newPt2 = conicOtherIntersection(c, known[1], v);

    if (newPt1 && newPt2) {
      lines.push([evaluateMap(basis, newPt1), evaluateMap(basis, newPt2)]);
    } else {
      lines.push(null);
    }
  }

  // 6 exceptional lines: Jacobian at each base point, using other base points as directions
  for (let i = 0; i < 6; i++) {
    const j1 = (i + 1) % 6, j2 = (i + 2) % 6;
    const p3a = evaluateMapDerivative(basis, pts[i], pts[j1]);
    const p3b = evaluateMapDerivative(basis, pts[i], pts[j2]);
    lines.push([p3a, p3b]);
  }

  return { basis, conics, lines, implicitCoeffs };
}

// ==================== Shader packing ====================

export function compute(sixPoints) {
  const pts = new Float32Array(12);
  for (let i = 0; i < 6; i++) {
    pts[i * 2] = sixPoints[i][0];
    pts[i * 2 + 1] = sixPoints[i][1];
  }

  const homog = sixPoints.map(([x, y]) => [x, y, 1]);
  const result = twentySevenLines(homog);

  const conics = new Float32Array(36);
  if (result) {
    for (let i = 0; i < 6; i++) {
      const c = result.conics[i];
      if (c) {
        for (let j = 0; j < 6; j++) conics[i * 6 + j] = c[j];
      }
    }
  }

  const linePoints = new Float32Array(27 * 4);
  const lineDirections = new Float32Array(27 * 4);
  let cubicCoeffs = null;

  if (result) {
    for (let n = 0; n < result.lines.length; n++) {
      const line = result.lines[n];
      if (!line) continue;
      const [p3a, p3b] = line;
      const off = n * 4;
      for (let k = 0; k < 4; k++) {
        linePoints[off + k] = p3a[k];
        lineDirections[off + k] = p3b[k] - p3a[k];
      }
    }
    cubicCoeffs = result.implicitCoeffs;
  }

  return { pts, conics, linePoints, lineDirections, cubicCoeffs };
}
