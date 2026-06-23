// Liquid-mercury fragment shaders.
//
// Both variants share one shading pipeline (metaball field -> gradient ->
// normal -> polished-chrome shading with a dark meniscus rim); only the
// metaball field() differs. These are plain GLSL strings, consumed by the
// useMercuryCanvas hook.

// Drifting droplets + a pool along the bottom (landing hero).
const FIELD_POOL = `
float field(vec2 P, float t, float asp) {
  float f = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float h1 = hash(fi * 1.7 + 1.0);
    float h2 = hash(fi * 3.3 + 5.0);
    float h3 = hash(fi * 5.1 + 9.0);
    float bx = (h1 * 2.0 - 1.0) * asp * 0.42;        // spread across width
    float by = -0.5 + h2 * 0.66;                     // biased toward the bottom
    float R  = mix(0.075, 0.21, smoothstep(0.30, -0.5, by)); // lower = larger
    vec2 c = vec2(
      bx + 0.06 * sin(t * (0.16 + 0.12 * h3) + fi * 2.0),
      by + 0.05 * cos(t * (0.13 + 0.10 * h1) + fi * 1.3)
    );
    vec2 d = P - c;
    f += exp(-dot(d, d) / (R * R));
  }
  f += smoothstep(-0.24, -0.60, P.y) * 1.25;         // mercury pooling at the bottom
  return f;
}
`;

// One irregular puddle: a central anchor lobe keeps the middle solid while
// off-center, varied-size satellite lobes give it an uneven, spilled
// silhouette (with the odd near-detached droplet). Each lobe drifts slowly
// so the spill keeps reshaping instead of reading as a circle (404).
const FIELD_BLOB = `
float field(vec2 P, float t, float asp) {
  float f = 0.0;
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float h1 = hash(fi * 1.3 + 2.0);
    float h2 = hash(fi * 2.7 + 4.0);
    float h3 = hash(fi * 4.1 + 6.0);
    float h4 = hash(fi * 5.9 + 8.0);
    float anchor = step(fi, 0.5);                  // lobe 0 = central anchor
    vec2 base = mix(
      vec2((h1 * 2.0 - 1.0) * 0.30, (h2 * 2.0 - 1.0) * 0.18),  // satellites, off-center
      vec2(0.02, -0.02),                                       // anchor, near center
      anchor
    );
    float a = t * (0.10 + 0.10 * h3) + fi * 1.9;
    vec2 c = base + vec2(cos(a), sin(a * 1.1 + h4 * 6.28)) * (0.025 + 0.035 * h4);
    float R = mix(0.08 + 0.12 * h1, 0.24, anchor); // anchor big, satellites varied
    vec2 d = P - c;
    f += exp(-dot(d, d) / (R * R));
  }
  return f;
}
`;

const makeFrag = (field: string, bottomLip: boolean) => `
precision highp float;

uniform vec2  uResolution;
uniform float uTime;
uniform vec2  uPointer;

float hash(float n) { return fract(sin(n) * 43758.5453123); }
${field}
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float asp = uResolution.x / uResolution.y;
  vec2 P = (gl_FragCoord.xy - 0.5 * uResolution.xy) / uResolution.y;
  P += uPointer * 0.05;     // gentle pointer parallax
  float t = uTime;

  // surface from the metaball field + its gradient (the dome slope)
  float e  = 0.0035;
  float f  = field(P, t, asp);
  float fx = field(P + vec2(e, 0.0), t, asp);
  float fy = field(P + vec2(0.0, e), t, asp);
  vec2 grad = vec2(fx - f, fy - f) / e;

  float m = smoothstep(0.52, 0.70, f);               // puddle coverage
  ${bottomLip ? "m *= smoothstep(0.0, 0.09, uv.y);   // dark lip at the very bottom" : ""}
  vec3 N = normalize(vec3(-grad * 0.15, 1.0));       // dome normal

  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 Rr = reflect(-V, N);

  // studio chrome reflection: dark below the horizon, bright above
  float ry = Rr.y * 0.5 + 0.5;
  vec3 envCol = mix(vec3(0.06, 0.065, 0.075), vec3(0.62, 0.65, 0.71), smoothstep(0.02, 0.52, ry));
  envCol = mix(envCol, vec3(0.98, 0.99, 1.0), smoothstep(0.56, 0.95, ry));

  // dark meniscus rim where the surface curves away from the viewer
  float facing = clamp(N.z, 0.0, 1.0);
  float rim = pow(1.0 - facing, 1.6);
  vec3 merc = mix(envCol, vec3(0.02, 0.02, 0.024), rim * 0.82);

  // tight specular hotspot (a hard sky reflection)
  vec3 L = normalize(vec3(0.28, 0.85, 0.5));
  vec3 Hh = normalize(L + V);
  float spec = pow(max(dot(N, Hh), 0.0), 220.0);
  merc += spec * 1.7;

  // near-black ground with a whisper of static grain so it isn't dead flat
  float grain = (hash(dot(floor(gl_FragCoord.xy), vec2(0.0131, 0.0277))) - 0.5) * 0.012;
  vec3 background = vec3(0.013, 0.014, 0.017) + grain;

  // soft contact darkening just outside the puddles (sits on the surface)
  float ao = smoothstep(0.30, 0.50, f) * (1.0 - m);
  background *= 1.0 - ao * 0.4;

  vec3 col = mix(background, merc, m);

  // corners sink into black
  float vig = smoothstep(1.35, 0.35, length(uv - 0.5) * 1.6);
  col *= mix(0.55, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const FRAG_FIELD = makeFrag(FIELD_POOL, true);
export const FRAG_BLOB = makeFrag(FIELD_BLOB, false);
