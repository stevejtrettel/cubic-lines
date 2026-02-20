/**
 * Takes 6 points in the plane and computes:
 *   - coefficients: Float32Array(20) — cubic surface coefficients (5 vec4s)
 *   - linePoints:   Float32Array(108) — 27 line base points (27 vec4s)
 *   - lineDirections: Float32Array(108) — 27 line directions (27 vec4s)
 *
 * Input: array of 6 [x, y] pairs.
 */

// Placeholder: returns Clebsch coefficients regardless of input
const CLEBSCH = new Float32Array([
      81, -189, -189,   -9,
    -189,   54,  126, -189,
     126,   -9,   81, -189,
      -9, -189,  126,   -9,
      81,   -9,   -9,    1,
]);

export function compute(sixPoints) {
  // TODO: compute coefficients and lines from the 6 points
  // For now, return the Clebsch diagonal cubic as a placeholder

  const coefficients = CLEBSCH;

  const linePoints = new Float32Array(27 * 4);
  const lineDirections = new Float32Array(27 * 4);
  for (let i = 0; i < 27; i++) {
    const angle = (i / 27) * Math.PI * 2.0;
    linePoints[i * 4 + 0] = Math.cos(angle) * 0.5;
    linePoints[i * 4 + 1] = Math.sin(angle) * 0.5;
    linePoints[i * 4 + 2] = 0.0;
    linePoints[i * 4 + 3] = 1.0;
    lineDirections[i * 4 + 0] = Math.cos(angle);
    lineDirections[i * 4 + 1] = Math.sin(angle);
    lineDirections[i * 4 + 2] = 0.3;
    lineDirections[i * 4 + 3] = 0.0;
  }

  return { coefficients, linePoints, lineDirections };
}
