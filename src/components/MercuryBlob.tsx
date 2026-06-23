"use client";

import { useRef } from "react";
import { useMercuryCanvas } from "@/hooks/useMercuryCanvas";
import { FRAG_BLOB } from "@/components/mercury-shaders";

/** A single morphing mercury spill, centered (404). */
export default function MercuryBlob() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useMercuryCanvas(canvasRef, FRAG_BLOB);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
    />
  );
}
