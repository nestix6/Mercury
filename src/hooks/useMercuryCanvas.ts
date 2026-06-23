import { useEffect, type RefObject } from "react";

/**
 * Drives a liquid-mercury WebGL background on the given <canvas>.
 *
 * Holds all the WebGL plumbing so the visible components (MercuryField,
 * MercuryBlob) stay thin — each just renders a <canvas> and passes its
 * fragment shader here. Degrades gracefully:
 *   - prefers-reduced-motion -> a single static frame, no animation loop.
 *   - no WebGL / context loss -> the CSS radial gradient on the parent shows.
 */

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
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

export function useMercuryCanvas(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  frag: string
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      canvas.getContext("webgl", { antialias: false, alpha: false }) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return; // CSS gradient fallback on the parent shows through

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
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
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
      // Deliberately do NOT call WEBGL_lose_context.loseContext(). In dev
      // Strict Mode (and on any canvas reuse) the effect re-runs setup on the
      // SAME canvas, and getContext() hands back the same context object. If we
      // had lost it here, that second setup would draw to a dead context and
      // the canvas would stay permanently blank. Freeing the per-run resources
      // above is enough; the context is reclaimed by GC on a true unmount.
    };
  }, [canvasRef, frag]);
}
