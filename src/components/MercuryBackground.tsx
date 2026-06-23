"use client";

import { useEffect, useRef } from "react";

/**
 * Liquid-mercury background.
 *
 * A full-screen WebGL fragment shader renders real-mercury-style metaballs:
 * slowly drifting droplets that merge into a pool along the bottom edge, shaded
 * like polished mercury (mirror reflection bright-up/dark-down, a thin dark
 * meniscus rim) on a near-black ground that the liquid dissolves into upward.
 *
 * This is a hand-built liquid-metal approximation, not a packaged effect.
 * It degrades gracefully:
 *   - prefers-reduced-motion -> a single static frame, no animation loop.
 *   - no WebGL / context loss -> the CSS radial gradient on the parent shows.
 */

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision highp float;

uniform vec2  uResolution;
uniform float uTime;
uniform vec2  uPointer;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

// Metaball field: drifting mercury droplets plus a pool along the bottom.
// Gaussian blobs merge smoothly, like real mercury beading together.
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
  m *= smoothstep(0.0, 0.09, uv.y);                  // dark lip at the very bottom
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

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export default function MercuryBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      canvas.getContext("webgl", { antialias: false, alpha: false }) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return; // CSS gradient fallback on the parent shows through

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(prog, "uResolution");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const uPointer = gl.getUniformLocation(prog, "uPointer");

    // render at reduced internal resolution for fill-rate headroom
    const SCALE = 0.66;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      const w = Math.max(1, Math.floor(window.innerWidth * dpr * SCALE));
      const h = Math.max(1, Math.floor(window.innerHeight * dpr * SCALE));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    // pointer parallax, lerped off the React render cycle
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    const start = performance.now();

    const renderFrame = (timeSeconds: number) => {
      current.x += (target.x - current.x) * 0.04;
      current.y += (target.y - current.y) * 0.04;
      gl.uniform1f(uTime, timeSeconds);
      gl.uniform2f(uPointer, current.x, current.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    if (reduce) {
      // one calm, static frame
      renderFrame(8.0);
    } else {
      window.addEventListener("pointermove", onPointer, { passive: true });
      const loop = (now: number) => {
        renderFrame((now - start) * 0.001);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    />
  );
}
