'use client';

import createGlobe, { COBEOptions } from 'cobe';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type MarkerDef = { location: [number, number]; size: number };
type ArcDef    = { from: [number, number]; to: [number, number] };

const MARKERS: MarkerDef[] = [
  { location: [14.5995, 120.9842], size: 0.030 }, // Manila
  { location: [19.076, 72.8777],   size: 0.040 }, // Mumbai
  { location: [23.8103, 90.4125],  size: 0.026 }, // Dhaka
  { location: [30.0444, 31.2357],  size: 0.033 }, // Cairo
  { location: [39.9042, 116.4074], size: 0.038 }, // Beijing
  { location: [-23.5505, -46.6333],size: 0.040 }, // São Paulo
  { location: [19.4326, -99.1332], size: 0.038 }, // Mexico City
  { location: [40.7128, -74.006],  size: 0.045 }, // New York
  { location: [34.6937, 135.5022], size: 0.025 }, // Osaka
  { location: [41.0082, 28.9784],  size: 0.028 }, // Istanbul
  { location: [51.5074, -0.1278],  size: 0.040 }, // London
  { location: [-33.8688, 151.2093],size: 0.030 }, // Sydney
  { location: [1.3521, 103.8198],  size: 0.025 }, // Singapore
  { location: [55.7558, 37.6176],  size: 0.028 }, // Moscow
  { location: [-1.2921, 36.8219],  size: 0.025 }, // Nairobi
];

const ARCS: ArcDef[] = [
  { from: [51.5074, -0.1278],   to: [40.7128, -74.006]   }, // London → New York
  { from: [40.7128, -74.006],   to: [-23.5505, -46.6333] }, // New York → São Paulo
  { from: [51.5074, -0.1278],   to: [-1.2921, 36.8219]   }, // London → Nairobi
  { from: [-1.2921, 36.8219],   to: [30.0444, 31.2357]   }, // Nairobi → Cairo
  { from: [30.0444, 31.2357],   to: [41.0082, 28.9784]   }, // Cairo → Istanbul
  { from: [19.076, 72.8777],    to: [1.3521, 103.8198]   }, // Mumbai → Singapore
  { from: [1.3521, 103.8198],   to: [34.6937, 135.5022]  }, // Singapore → Osaka
  { from: [39.9042, 116.4074],  to: [34.6937, 135.5022]  }, // Beijing → Osaka
  { from: [-33.8688, 151.2093], to: [1.3521, 103.8198]   }, // Sydney → Singapore
  { from: [40.7128, -74.006],   to: [51.5074, -0.1278]   }, // New York → London
];

const BASE_CONFIG: Omit<COBEOptions, 'width' | 'height'> = {
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 1,
  diffuse: 0.5,
  mapSamples: 22000,
  mapBrightness: 5,
  baseColor: [0.06, 0.08, 0.18],
  markerColor: [34 / 255, 255 / 255, 170 / 255],
  glowColor: [0.03, 0.15, 0.10],
  markers: MARKERS,
  arcs: ARCS.map(a => ({ from: a.from, to: a.to })),
  arcColor: [34 / 255, 255 / 255, 170 / 255],
  arcWidth: 0.6,
  arcHeight: 0.3,
};

export function Globe({ className }: { className?: string }) {
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const phiRef          = useRef(0);
  const widthRef        = useRef(0);
  const pointerRef      = useRef<number | null>(null);
  const pointerMovement = useRef(0);
  const rRef            = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => { widthRef.current = canvas.offsetWidth; };
    window.addEventListener('resize', updateSize);
    updateSize();

    const globe = createGlobe(canvas, {
      ...BASE_CONFIG,
      width:  widthRef.current * 2,
      height: widthRef.current * 2,
    });

    let raf: number;
    const animate = () => {
      if (pointerRef.current === null) phiRef.current += 0.003;

      const t = Date.now() / 1000;

      // Per-marker pulse: sine wave with phase offset per marker
      const pulsedMarkers = MARKERS.map((m, i) => ({
        ...m,
        size: m.size * (0.5 + 0.5 * Math.abs(Math.sin(t * 1.1 + i * 0.8))),
      }));

      // Arc height bounces between 0.15 and 0.45 over ~4 s cycle
      const arcHeight = 0.15 + 0.30 * (0.5 + 0.5 * Math.sin(t * 1.5));

      globe.update({
        phi:       phiRef.current + rRef.current,
        width:     widthRef.current * 2,
        height:    widthRef.current * 2,
        markers:   pulsedMarkers,
        arcHeight,
      });
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    setTimeout(() => { canvas.style.opacity = '1'; }, 120);

    return () => {
      globe.destroy();
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateSize);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn('absolute inset-0 mx-auto aspect-square w-full', className)}>
      <canvas
        ref={canvasRef}
        className="size-full opacity-0 transition-opacity duration-700"
        style={{ contain: 'layout paint size', cursor: 'grab' }}
        onPointerDown={(e) => {
          pointerRef.current = e.clientX - pointerMovement.current;
          (e.currentTarget as HTMLCanvasElement).style.cursor = 'grabbing';
        }}
        onPointerUp={() => {
          pointerRef.current = null;
          if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
        }}
        onPointerOut={() => {
          pointerRef.current = null;
          if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
        }}
        onMouseMove={(e) => {
          if (pointerRef.current !== null) {
            const delta = e.clientX - pointerRef.current;
            pointerMovement.current = delta;
            rRef.current = delta / 200;
          }
        }}
        onTouchMove={(e) => {
          if (e.touches[0] && pointerRef.current !== null) {
            const delta = e.touches[0].clientX - pointerRef.current;
            pointerMovement.current = delta;
            rRef.current = delta / 200;
          }
        }}
      />
    </div>
  );
}
