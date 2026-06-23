"use client";

import { useRef } from "react";
import { useMercuryCanvas } from "@/hooks/useMercuryCanvas";
import { FRAG_FIELD } from "@/components/mercury-shaders";

/** Liquid-mercury field: drifting droplets pooling at the bottom (landing hero). */
export default function MercuryField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useMercuryCanvas(canvasRef, FRAG_FIELD);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    />
  );
}
