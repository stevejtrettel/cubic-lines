// Test shader for the P2 viewport.
// Draws a soft radial gradient so we can verify the layer is working.

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 c = uv - 0.5;
    float d = length(c);
    vec3 col = mix(vec3(0.92, 0.90, 0.86), vec3(0.70, 0.75, 0.82), d * 1.5);
    fragColor = vec4(col, 1.0);
}
