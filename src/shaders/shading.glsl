// Phong-style shading utilities.
//
// Requires LIGHT_DIR to be #defined before inclusion.

struct Material {
    vec3  color;
    float specExp;
    float ambient;
};

// Shade a surface with diffuse + specular (Blinn-Phong).
// nn = surface normal (toward viewer), rd = ray direction.
vec3 shade(Material mat, vec3 nn, vec3 rd) {
    float diff = mat.ambient + (1.0 - mat.ambient) * max(0.0, dot(nn, LIGHT_DIR));
    float spec = pow(max(0.0, dot(LIGHT_DIR, reflect(rd, nn))), mat.specExp);
    return mat.color * diff + vec3(spec);
}

// Lighter shading variant for lines (fixed ambient/spec).
vec3 shadeLine(vec3 color, vec3 nn, vec3 rd) {
    float diff = 0.3 + 0.7 * max(0.0, dot(nn, LIGHT_DIR));
    float spec = pow(max(0.0, dot(LIGHT_DIR, reflect(rd, nn))), 64.0);
    return color * diff + vec3(spec * 0.4);
}
