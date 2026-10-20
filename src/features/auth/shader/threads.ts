/**
 * The sign-in panel's living backdrop: loose threads drift across plum cloth, bend toward the
 * pointer like thread drawn toward a needle, and one orange thread runs through as a stitch.
 * Everything is computed on the GPU: no textures, no images.
 */
export const vertex = /* glsl */ `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const fragment = /* glsl */ `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform float uPull;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 q = vec2(uv.x * aspect, uv.y);
  vec2 p = vec2(uPointer.x * aspect, uPointer.y);

  // cloth: fine linen grain on deep plum
  float grain = noise(q * vec2(220.0, 9.0)) * 0.5 + noise(q * vec2(9.0, 220.0)) * 0.5;
  vec3 col = mix(vec3(0.082, 0.039, 0.094), vec3(0.16, 0.075, 0.18), 0.35 + 0.25 * grain);

  float t = uTime;
  vec3 sand = vec3(0.914, 0.824, 0.659);
  vec3 orange = vec3(0.878, 0.431, 0.176);

  for (int i = 0; i < 13; i++){
    float fi = float(i);
    float base = 0.12 + fi * 0.062;
    float freq = 1.4 + mod(fi * 0.73, 1.3);
    float wave = 0.035 * sin(q.x * freq + t * (0.18 + 0.03 * fi) + fi * 1.7)
               + 0.018 * sin(q.x * freq * 2.3 - t * 0.21 + fi);
    float y = base + wave + (noise(vec2(q.x * 1.3 + fi * 3.1, t * 0.08)) - 0.5) * 0.04;

    // the pointer draws nearby threads toward it, like a needle gathering a seam
    float dx = q.x - p.x;
    float near = exp(-dx * dx * 9.0) * exp(-pow(y - p.y, 2.0) * 18.0);
    y += (p.y - y) * near * uPull * 0.55;

    float d = abs(uv.y - y);
    float w = 0.0016 + 0.0009 * sin(fi * 2.1);
    float line = 1.0 - smoothstep(w, w + 0.0028, d);
    float halo = (1.0 - smoothstep(0.0, 0.03, d)) * 0.06;
    float fibre = 0.75 + 0.25 * noise(vec2(q.x * 140.0, fi));

    bool stitch = i == 4;
    if (stitch){
      float dash = step(0.42, fract(q.x * 7.0 - t * 0.25));
      col = mix(col, orange, line * dash * 0.95);
      col += orange * halo * 1.6;
    } else {
      col = mix(col, sand * fibre, line * (0.28 + 0.22 * near * uPull));
      col += sand * halo * 0.35;
    }
  }

  // a warm lamp where the pointer rests
  float lamp = 1.0 - smoothstep(0.0, 0.55, distance(q, p));
  col += orange * lamp * 0.10 * uPull;

  col *= 1.0 - 0.5 * smoothstep(0.45, 1.05, distance(uv, vec2(0.5, 0.55)));
  gl_FragColor = vec4(col, 1.0);
}
`;
