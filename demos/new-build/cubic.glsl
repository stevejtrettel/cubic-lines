// Demo: cubic surface raytracer with 27 lines.
//
// This file contains only demo-specific rendering: materials,
// the render() compositor, and mainImage(). The surface math
// (f, fGrad, marchIso, line queries) comes from cubic-surface.glsl,
// and generic 3D utilities from the shared shader library.
//
// All shared GLSL is concatenated before this file by main.js.
// Parameters (BOX_SIZE, LIGHT_DIR, STEP_SIZE, LINE_RADIUS,
// BOUNDARY_RADIUS) are defined in shaderConfig in main.js.

#define CAM_DIST 5.0

// --- Materials ---

const Material CUBIC_FRONT  = Material(vec3(0.85, 0.78, 0.65), 128.0, 0.5);
const Material CUBIC_BACK   = Material(vec3(0.55, 0.25, 0.18), 64.0, 0.4);
const Material BOUNDARY_MAT = Material(vec3(0.1), 32.0, 0.6);

// --- Render ---

vec3 render(vec3 ro, vec3 rd) {
    vec3 col = mix(vec3(0.92), vec3(0.5, 0.6, 0.9), 0.5 + 0.5 * rd.y);

    vec2 tnf = boxIntersect(ro, rd);
    float t_min = max(0.0, tnf.x);
    float t_max = tnf.y;
    if (t_max <= t_min) return col;

    // Cubic surface (sign-change march)
    float tSurf = marchIso(ro, rd, t_min, t_max);

    // Boundary tube (sphere-trace where f=0 meets the box)
    float tBound = t_max;
    float tb = t_min;
    for (int i = 0; i < 64; i++) {
        vec3 p = ro + rd * tb;
        float d = boundaryDist(p) - BOUNDARY_RADIUS;
        if (d < 0.001) { tBound = tb; break; }
        tb += d * 0.5;
        if (tb > t_max) break;
    }

    // 27 lines (sphere-trace cylinders)
    float tLine = t_max;
    float tl = t_min + 0.01;
    for (int i = 0; i < 128; i++) {
        vec3 p = ro + rd * tl;
        float d = allLinesDist(p) - LINE_RADIUS;
        if (d < 0.001) { tLine = tl; break; }
        tl += d;
        if (tl > t_max) break;
    }

    // Shade whichever is closest
    float tHit = min(tSurf, min(tLine, tBound));
    if (tHit < t_max) {
        vec3 p = ro + rd * tHit;
        if (tHit == tBound) {
            vec2 e = vec2(0.005, 0.0);
            float v = boundaryDist(p);
            vec3 nn = normalize(vec3(
                boundaryDist(p+e.xyy)-v,
                boundaryDist(p+e.yxy)-v,
                boundaryDist(p+e.yyx)-v));
            col = shade(BOUNDARY_MAT, nn, rd);
        } else if (tHit == tLine) {
            int idx = closestLine(p);
            vec3 nn = cylinderNormal(p, linePoints[idx], lineDirections[idx]);
            col = shadeLine(lineColor(idx), nn, rd);
        } else {
            vec3 nn = normalize(fGrad(p));
            bool backFace = dot(nn, rd) > 0.0;
            if (backFace) nn = -nn;
            if (backFace)
                col = mix(col, shade(CUBIC_BACK, nn, rd), 0.7);
            else
                col = mix(col, shade(CUBIC_FRONT, nn, rd), 0.7);
        }
    }

    return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    vec3 ta = vec3(0.0);
    vec3 ro = orbitCamera(CAM_DIST, vec3(CAM_DIST * 0.5, 3.0, CAM_DIST * 0.7));
    mat3 cam = setCamera(ro, ta, 0.0);
    vec3 rd = cam * normalize(vec3(uv, 2.0));
    vec3 col = render(ro, rd);
    col = sqrt(col);
    fragColor = vec4(col, 1.0);
}
