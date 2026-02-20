// P2 viewport: draws the 15 lines connecting 6 points,
// and the 6 conics (each through 5 of the 6 points).
//
// conics[2*i], conics[2*i+1] = coefficients of conic i:
//   a·x² + b·y² + c·z² + d·xy + e·yz + f·xz  (z=1 in affine chart)
//   vec3(a, b, c), vec3(d, e, f)

float lineDist(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a;
    return abs(ab.y * (p.x - a.x) - ab.x * (p.y - a.y)) / length(ab);
}

float conicF(vec2 p, int i) {
    float x = p.x, y = p.y;
    vec3 abc = conics[2*i], def_ = conics[2*i+1];
    return abc.x*x*x + abc.y*y*y + abc.z
         + def_.x*x*y + def_.y*y   + def_.z*x;
}

vec2 conicGrad(vec2 p, int i) {
    float x = p.x, y = p.y;
    vec3 abc = conics[2*i], def_ = conics[2*i+1];
    return vec2(
        2.0*abc.x*x + def_.x*y + def_.z,
        2.0*abc.y*y + def_.x*x + def_.y
    );
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv;
    if (iResolution.x > iResolution.y) {
        float aspect = iResolution.x / iResolution.y;
        uv.x = (fragCoord.x / iResolution.x - 0.5) * 4.0 * aspect;
        uv.y = (fragCoord.y / iResolution.y - 0.5) * 4.0;
    } else {
        float aspect = iResolution.y / iResolution.x;
        uv.x = (fragCoord.x / iResolution.x - 0.5) * 4.0;
        uv.y = (fragCoord.y / iResolution.y - 0.5) * 4.0 * aspect;
    }
    uv.y = -uv.y;

    vec3 bg = vec3(0.92, 0.90, 0.86);
    vec3 lineCol = vec3(0.75, 0.75, 0.78);
    vec3 conicCol = vec3(0.15, 0.4, 0.7);
    float lineWidth = 0.01;
    float conicWidth = 0.015;
    float aa = 2.0 / min(iResolution.x, iResolution.y) * 4.0;

    vec3 col = bg;

    // Draw 6 conics
    for (int i = 0; i < 6; i++) {
        float f = conicF(uv, i);
        vec2 g = conicGrad(uv, i);
        float glen = length(g);
        if (glen > 1e-6) {
            float d = abs(f) / glen;
            col = mix(conicCol, col, smoothstep(conicWidth - aa, conicWidth + aa, d));
        }
    }

    // Draw 15 lines
    float minD = 1e9;
    for (int i = 0; i < 6; i++) {
        for (int j = i + 1; j < 6; j++) {
            float d = lineDist(uv, pts[i], pts[j]);
            minD = min(minD, d);
        }
    }
    col = mix(lineCol, col, smoothstep(lineWidth - aa, lineWidth + aa, minD));

    fragColor = vec4(col, 1.0);
}
