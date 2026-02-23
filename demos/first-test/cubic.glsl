// Self-contained cubic surface raytracer with 27 lines.
// Everything is in this one file — no shared GLSL imports.

// ==================== Config ====================

#define PI              3.14159265359
#define BOX_SIZE        2.0
#define LIGHT_DIR       normalize(vec3(0.4, 1.0, 0.3))
#define STEP_SIZE       0.008
#define LINE_RADIUS     0.015
#define BOUNDARY_RADIUS 0.015
#define CAM_DIST        5.0

// ==================== Camera ====================

mat3 setCamera(vec3 ro, vec3 ta, float cr) {
    vec3 cw = normalize(ta - ro);
    vec3 cp = vec3(sin(cr), cos(cr), 0.0);
    vec3 cu = normalize(cross(cw, cp));
    vec3 cv = normalize(cross(cu, cw));
    return mat3(cu, cv, cw);
}

vec3 orbitCamera(float dist, vec3 defaultRo) {
    if (iMouse.z > 0.5) {
        float phi = (iMouse.x / iResolution.x) * PI * 2.0;
        float psi = -((iMouse.y / iResolution.y) - 0.5) * PI;
        return dist * vec3(cos(phi)*cos(psi), sin(psi), sin(phi)*cos(psi));
    }
    return defaultRo;
}

// ==================== SDF ====================

float boxSDF(vec3 p) {
    vec3 q = abs(p) - vec3(BOX_SIZE);
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

vec2 boxIntersect(vec3 ro, vec3 rd) {
    vec3 m = 1.0 / rd;
    vec3 n = m * ro;
    vec3 k = abs(m) * BOX_SIZE;
    vec3 t1 = -n - k;
    vec3 t2 = -n + k;
    float tN = max(max(t1.x, t1.y), t1.z);
    float tF = min(min(t2.x, t2.y), t2.z);
    if (tN > tF || tF < 0.0) return vec2(-1.0);
    return vec2(tN, tF);
}

// ==================== Projective lines ====================

float cylinderDist(vec3 p, vec4 linePt, vec4 lineDir) {
    if (abs(linePt.w) < 1e-8) return 1e6;
    vec3 a = linePt.xyz / linePt.w;
    vec3 d = (lineDir.xyz * linePt.w - linePt.xyz * lineDir.w) / (linePt.w * linePt.w);
    float dlen = length(d);
    if (dlen < 1e-8) return 1e6;
    return length(cross(p - a, d)) / dlen;
}

vec3 cylinderNormal(vec3 p, vec4 linePt, vec4 lineDir) {
    vec3 a = linePt.xyz / linePt.w;
    vec3 d = (lineDir.xyz * linePt.w - linePt.xyz * lineDir.w) / (linePt.w * linePt.w);
    d = normalize(d);
    vec3 pa = p - a;
    return normalize(pa - dot(pa, d) * d);
}

// ==================== Shading ====================

struct Material {
    vec3  color;
    float specExp;
    float ambient;
};

vec3 shade(Material mat, vec3 nn, vec3 rd) {
    float diff = mat.ambient + (1.0 - mat.ambient) * max(0.0, dot(nn, LIGHT_DIR));
    float spec = pow(max(0.0, dot(LIGHT_DIR, reflect(rd, nn))), mat.specExp);
    return mat.color * diff + vec3(spec);
}

vec3 shadeLine(vec3 color, vec3 nn, vec3 rd) {
    float diff = 0.3 + 0.7 * max(0.0, dot(nn, LIGHT_DIR));
    float spec = pow(max(0.0, dot(LIGHT_DIR, reflect(rd, nn))), 64.0);
    return color * diff + vec3(spec * 0.4);
}

// ==================== Cubic surface ====================

// Coefficient packing (graded lexicographic order):
//
//   [0] = (x³,  x²y, x²z, x²w)     indices 0–3
//   [1] = (xy², xyz, xyw, xz²)      indices 4–7
//   [2] = (xzw, xw², y³,  y²z)      indices 8–11
//   [3] = (y²w, yz², yzw, yw²)      indices 12–15
//   [4] = (z³,  z²w, zw², w³ )      indices 16–19

float f(vec3 p) {
    float x = p.x, y = p.y, z = p.z;
    float x2 = x*x, y2 = y*y, z2 = z*z;

    return coefficients[0].x * x2*x   // x³
         + coefficients[0].y * x2*y   // x²y
         + coefficients[0].z * x2*z   // x²z
         + coefficients[0].w * x2     // x²w → x²
         + coefficients[1].x * x*y2   // xy²
         + coefficients[1].y * x*y*z  // xyz
         + coefficients[1].z * x*y    // xyw → xy
         + coefficients[1].w * x*z2   // xz²
         + coefficients[2].x * x*z    // xzw → xz
         + coefficients[2].y * x      // xw² → x
         + coefficients[2].z * y2*y   // y³
         + coefficients[2].w * y2*z   // y²z
         + coefficients[3].x * y2     // y²w → y²
         + coefficients[3].y * y*z2   // yz²
         + coefficients[3].z * y*z    // yzw → yz
         + coefficients[3].w * y      // yw² → y
         + coefficients[4].x * z2*z   // z³
         + coefficients[4].y * z2     // z²w → z²
         + coefficients[4].z * z      // zw² → z
         + coefficients[4].w;         // w³  → 1
}

vec3 fGrad(vec3 p) {
    float x = p.x, y = p.y, z = p.z;
    float x2 = x*x, y2 = y*y, z2 = z*z;

    float dx = 3.0*coefficients[0].x * x2     // ∂(x³)/∂x
             + 2.0*coefficients[0].y * x*y     // ∂(x²y)/∂x
             + 2.0*coefficients[0].z * x*z     // ∂(x²z)/∂x
             + 2.0*coefficients[0].w * x       // ∂(x²)/∂x
             +     coefficients[1].x * y2      // ∂(xy²)/∂x
             +     coefficients[1].y * y*z     // ∂(xyz)/∂x
             +     coefficients[1].z * y       // ∂(xy)/∂x
             +     coefficients[1].w * z2      // ∂(xz²)/∂x
             +     coefficients[2].x * z       // ∂(xz)/∂x
             +     coefficients[2].y;          // ∂(x)/∂x

    float dy =     coefficients[0].y * x2      // ∂(x²y)/∂y
             + 2.0*coefficients[1].x * x*y     // ∂(xy²)/∂y
             +     coefficients[1].y * x*z     // ∂(xyz)/∂y
             +     coefficients[1].z * x       // ∂(xy)/∂y
             + 3.0*coefficients[2].z * y2      // ∂(y³)/∂y
             + 2.0*coefficients[2].w * y*z     // ∂(y²z)/∂y
             + 2.0*coefficients[3].x * y       // ∂(y²)/∂y
             +     coefficients[3].y * z2      // ∂(yz²)/∂y
             +     coefficients[3].z * z       // ∂(yz)/∂y
             +     coefficients[3].w;          // ∂(y)/∂y

    float dz =     coefficients[0].z * x2      // ∂(x²z)/∂z
             +     coefficients[1].y * x*y     // ∂(xyz)/∂z
             + 2.0*coefficients[1].w * x*z     // ∂(xz²)/∂z
             +     coefficients[2].x * x       // ∂(xz)/∂z
             +     coefficients[2].w * y2      // ∂(y²z)/∂z
             + 2.0*coefficients[3].y * y*z     // ∂(yz²)/∂z
             +     coefficients[3].z * y       // ∂(yz)/∂z
             + 3.0*coefficients[4].x * z2      // ∂(z³)/∂z
             + 2.0*coefficients[4].y * z       // ∂(z²)/∂z
             +     coefficients[4].z;          // ∂(z)/∂z

    return vec3(dx, dy, dz);
}

float boundaryDist(vec3 p) {
    float dSurf = abs(f(p)) / max(length(fGrad(p)), 1e-6);
    float dBox = abs(boxSDF(p));
    return sqrt(dSurf*dSurf + dBox*dBox);
}

float marchIso(vec3 ro, vec3 rd, float tMin, float tMax) {
    float val = f(ro + rd * tMin);
    float inv = val > 0.0 ? 1.0 : -1.0;
    for (float t = tMin; t < tMax; t += STEP_SIZE) {
        val = f(ro + rd * t);
        if (val * inv < 0.0) return t;
    }
    return tMax;
}

// ==================== 27 lines ====================

float allLinesDist(vec3 p) {
    float d = 1e6;
    for (int i = 0; i < 27; i++) {
        d = min(d, cylinderDist(p, linePoints[i], lineDirections[i]));
    }
    return d;
}

int closestLine(vec3 p) {
    float best = 1e6;
    int idx = 0;
    for (int i = 0; i < 27; i++) {
        float d = cylinderDist(p, linePoints[i], lineDirections[i]);
        if (d < best) { best = d; idx = i; }
    }
    return idx;
}

// 0–14: pair lines (gray), 15–20: conic lines (blue), 21–26: exceptional lines (red)
vec3 lineColor(int i) {
    if (i < 15) return vec3(0.55);
    if (i < 21) return vec3(0.2, 0.45, 0.9);
    return vec3(0.9, 0.25, 0.2);
}

// ==================== Materials ====================

const Material CUBIC_FRONT  = Material(vec3(0.85, 0.78, 0.65), 128.0, 0.5);
const Material CUBIC_BACK   = Material(vec3(0.55, 0.25, 0.18), 64.0, 0.4);
const Material BOUNDARY_MAT = Material(vec3(0.1), 32.0, 0.6);

// ==================== Render ====================

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
