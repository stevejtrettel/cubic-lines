/**
 * Parse a scene2d.glsl file and extract points + conic coefficients.
 *
 * Returns { pts: Float32Array(12), conics: Float32Array(36) }
 * matching the format expected by the p2 shader uniforms.
 */
export function parseScene2d(source) {
  // Extract all float literals from a GLSL array block
  const floats = (block) =>
    [...block.matchAll(/-?\d+\.\d+/g)].map(m => parseFloat(m[0]));

  // Match POINTS[6] block
  const ptsMatch = source.match(
    /const\s+vec2\s+POINTS\[6\]\s*=\s*vec2\[6\]\(([\s\S]*?)\);/
  );
  if (!ptsMatch) throw new Error('Could not find POINTS[6] in scene2d file');
  const pts = new Float32Array(floats(ptsMatch[1]));
  if (pts.length !== 12) throw new Error(`Expected 12 point floats, got ${pts.length}`);

  // Match PLANE_CONICS[6] block
  const conicsMatch = source.match(
    /const\s+Conic2D\s+PLANE_CONICS\[6\]\s*=\s*Conic2D\[6\]\(([\s\S]*?)\);/
  );
  if (!conicsMatch) throw new Error('Could not find PLANE_CONICS[6] in scene2d file');
  const conics = new Float32Array(floats(conicsMatch[1]));
  if (conics.length !== 36) throw new Error(`Expected 36 conic floats, got ${conics.length}`);

  return { pts, conics };
}
