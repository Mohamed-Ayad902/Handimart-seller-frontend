"use client";

import { useEffect, useRef } from "react";
import { fragment, vertex } from "./threads";

/**
 * Raw WebGL (no engine): one full-screen triangle running the threads shader. Renders at a
 * capped resolution, pauses off screen or in a hidden tab, draws one still frame for reduced
 * motion, and does nothing when WebGL is unavailable (the plum panel underneath is the fallback).
 */
export default function ThreadShader() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    };
    const vs = compile(gl.VERTEX_SHADER, vertex);
    const fs = compile(gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "uRes");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uPointer = gl.getUniformLocation(program, "uPointer");
    const uPull = gl.getUniformLocation(program, "uPull");

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = matchMedia("(pointer: coarse)").matches;
    const scale = Math.min(window.devicePixelRatio || 1, coarse ? 1 : 1.5) * 0.8;
    const target = { x: 0.62, y: 0.42, pull: coarse ? 0.4 : 0 };
    const now = { x: target.x, y: target.y, pull: target.pull };
    let visible = true;
    let raf = 0;
    const start = performance.now();

    const resize = () => {
      canvas.width = Math.max(2, Math.round(canvas.clientWidth * scale));
      canvas.height = Math.max(2, Math.round(canvas.clientHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    const draw = () => {
      now.x += (target.x - now.x) * 0.07;
      now.y += (target.y - now.y) * 0.07;
      now.pull += (target.pull - now.pull) * 0.05;
      gl.uniform1f(uTime, reduce ? 6 : (performance.now() - start) / 1000);
      gl.uniform2f(uPointer, now.x, now.y);
      gl.uniform1f(uPull, now.pull);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = () => {
      draw();
      raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
    };
    const run = () => {
      if (!raf && !reduce) raf = requestAnimationFrame(loop);
    };

    const host = canvas.parentElement ?? canvas;
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width;
      target.y = 1 - (e.clientY - r.top) / r.height;
      target.pull = 1;
    };
    const onLeave = () => (target.pull = 0);
    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) run();
    });
    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) draw();
    });
    const onVisibility = () => !document.hidden && run();
    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
    };

    io.observe(canvas);
    ro.observe(canvas);
    resize();
    draw();
    run();
    document.addEventListener("visibilitychange", onVisibility);
    canvas.addEventListener("webglcontextlost", onLost);
    if (!coarse && !reduce) {
      host.addEventListener("pointermove", onMove);
      host.addEventListener("pointerleave", onLeave);
    }

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onLost);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 size-full" />;
}
