'use client';

import createGlobe, { COBEOptions } from 'cobe';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const GLOBE_CONFIG: COBEOptions = {
  width: 800,
  height: 800,
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 1,
  diffuse: 0.6,
  mapSamples: 20000,
  mapBrightness: 6,
  // Ocean base matching #050816 palette
  baseColor: [0.08, 0.10, 0.22],
  // #22FFAA accent markers
  markerColor: [34 / 255, 255 / 255, 170 / 255],
  // Subtle green atmospheric glow
  glowColor: [0.04, 0.20, 0.14],
  markers: [
    { location: [14.5995, 120.9842], size: 0.03 },
    { location: [19.076, 72.8777],   size: 0.1  },
    { location: [23.8103, 90.4125],  size: 0.05 },
    { location: [30.0444, 31.2357],  size: 0.07 },
    { location: [39.9042, 116.4074], size: 0.08 },
    { location: [-23.5505, -46.6333],size: 0.1  },
    { location: [19.4326, -99.1332], size: 0.1  },
    { location: [40.7128, -74.006],  size: 0.1  },
    { location: [34.6937, 135.5022], size: 0.05 },
    { location: [41.0082, 28.9784],  size: 0.06 },
    { location: [51.5074, -0.1278],  size: 0.08 },
    { location: [-33.8688, 151.2093],size: 0.06 },
    { location: [1.3521, 103.8198],  size: 0.04 },
    { location: [55.7558, 37.6176],  size: 0.07 },
    { location: [-1.2921, 36.8219],  size: 0.04 },
  ],
};

export function Globe({
  className,
  config = GLOBE_CONFIG,
}: {
  className?: string;
  config?: COBEOptions;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phiRef = useRef(0);
  const widthRef = useRef(0);
  const pointerInteracting = useRef<number | null>(null);
  const pointerMovement = useRef(0);
  const rRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      widthRef.current = canvas.offsetWidth;
    };
    window.addEventListener('resize', updateSize);
    updateSize();

    const globe = createGlobe(canvas, {
      ...config,
      width: widthRef.current * 2,
      height: widthRef.current * 2,
    });

    let raf: number;
    const animate = () => {
      if (pointerInteracting.current === null) phiRef.current += 0.003;
      globe.update({
        phi: phiRef.current + rRef.current,
        width: widthRef.current * 2,
        height: widthRef.current * 2,
      });
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);

    setTimeout(() => { canvas.style.opacity = '1'; }, 100);

    return () => {
      globe.destroy();
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateSize);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn('absolute inset-0 mx-auto aspect-square w-full max-w-[700px]', className)}>
      <canvas
        ref={canvasRef}
        className="size-full opacity-0 transition-opacity duration-700"
        style={{ contain: 'layout paint size', cursor: 'grab' }}
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX - pointerMovement.current;
          (e.currentTarget as HTMLCanvasElement).style.cursor = 'grabbing';
        }}
        onPointerUp={() => {
          pointerInteracting.current = null;
          (canvasRef.current as HTMLCanvasElement | null)!.style.cursor = 'grab';
        }}
        onPointerOut={() => {
          pointerInteracting.current = null;
          if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
        }}
        onMouseMove={(e) => {
          if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current;
            pointerMovement.current = delta;
            rRef.current = delta / 200;
          }
        }}
        onTouchMove={(e) => {
          if (e.touches[0] && pointerInteracting.current !== null) {
            const delta = e.touches[0].clientX - pointerInteracting.current;
            pointerMovement.current = delta;
            rRef.current = delta / 200;
          }
        }}
      />
    </div>
  );
}
