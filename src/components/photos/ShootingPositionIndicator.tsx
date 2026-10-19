'use client';

import { Compass, ArrowUp, Focus } from 'lucide-react';

interface Props {
  azimuth: number | null | undefined;   // 0-360 degrees, 0=N, 90=E
  elevation: number | null | undefined; // -10 to +80 degrees
  focalLength: number | null | undefined; // mm, full-frame equivalent
}

/**
 * Visual indicator for replicating a shooting position:
 * - Compass rose rotated to the azimuth direction
 * - Elevation bar showing the camera tilt above/below horizon
 * - Focal length field of view cone
 *
 * Used on photo detail page (机位复现 card) and upload form (live preview).
 */
export function ShootingPositionIndicator({ azimuth, elevation, focalLength }: Props) {
  const az = typeof azimuth === 'number' ? azimuth : null;
  const el = typeof elevation === 'number' ? elevation : null;
  const fl = typeof focalLength === 'number' ? focalLength : null;

  // Approximate horizontal FOV for a full-frame sensor.
  const fov = fl && fl > 0
    ? Math.round(2 * Math.atan2(36, 2 * fl) * (180 / Math.PI))
    : null;

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Compass */}
      <div className="flex flex-col items-center justify-center bg-muted/40 rounded-lg p-3 border border-border/50">
        <div className="relative w-16 h-16 mb-2">
          <svg viewBox="0 0 80 80" className="w-full h-full">
            <circle cx="40" cy="40" r="34" fill="none" stroke="oklch(0.28 0.014 265)" strokeWidth="1" />
            <circle cx="40" cy="40" r="2" fill="oklch(0.62 0.19 268)" />
            {/* Cardinal ticks */}
            {[0, 90, 180, 270].map((deg) => {
              const r1 = 30, r2 = 34;
              const rad = (deg - 90) * Math.PI / 180;
              const x1 = 40 + r1 * Math.cos(rad);
              const y1 = 40 + r1 * Math.sin(rad);
              const x2 = 40 + r2 * Math.cos(rad);
              const y2 = 40 + r2 * Math.sin(rad);
              return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="oklch(0.40 0.014 265)" strokeWidth="1" />;
            })}
            {/* N label */}
            <text x="40" y="12" textAnchor="middle" fontSize="9" fill="oklch(0.68 0.015 255)">N</text>
            {/* Arrow rotated to azimuth */}
            {az !== null && (
              <g transform={`rotate(${az} 40 40)`}>
                <path d="M 40 12 L 35 40 L 40 36 L 45 40 Z" fill="oklch(0.80 0.15 75)" />
              </g>
            )}
          </svg>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">方位角</div>
        <div className="text-sm font-semibold font-mono">
          {az !== null ? `${az.toFixed(0)}°` : '—'}
        </div>
      </div>

      {/* Elevation */}
      <div className="flex flex-col items-center justify-center bg-muted/40 rounded-lg p-3 border border-border/50">
        <div className="relative w-16 h-16 mb-2 flex items-end justify-center">
          <svg viewBox="0 0 80 80" className="w-full h-full">
            {/* Horizon line */}
            <line x1="6" y1="40" x2="74" y2="40" stroke="oklch(0.28 0.014 265)" strokeWidth="1" strokeDasharray="2 2" />
            {/* Vertical scale -->
            <line x1="40" y1="8" x2="40" y2="72" stroke="oklch(0.28 0.014 265)" strokeWidth="0.5" />
            {/* Elevation bar */}
            {el !== null && (
              <line
                x1="40"
                y1={40 - (el / 80) * 32}
                x2="40"
                y2="40"
                stroke={el >= 0 ? 'oklch(0.80 0.15 75)' : 'oklch(0.60 0.22 25)'}
                strokeWidth="2"
              />
            )}
          </svg>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">仰角</div>
        <div className="text-sm font-semibold font-mono">
          {el !== null ? `${el.toFixed(0)}°` : '—'}
        </div>
      </div>

      {/* Focal length / FOV */}
      <div className="flex flex-col items-center justify-center bg-muted/40 rounded-lg p-3 border border-border/50">
        <div className="relative w-16 h-16 mb-2 flex items-center justify-center">
          <svg viewBox="0 0 80 80" className="w-full h-full">
            <circle cx="40" cy="40" r="34" fill="none" stroke="oklch(0.28 0.014 265)" strokeWidth="0.5" />
            {/* FOV cone */}
            {fov !== null && fov > 0 && fov < 180 && (
              <path
                d={`M 40 40 L ${40 - Math.sin(fov * Math.PI / 360) * 30} ${40 - Math.cos(fov * Math.PI / 360) * 30} A 30 30 0 0 1 ${40 + Math.sin(fov * Math.PI / 360) * 30} ${40 - Math.cos(fov * Math.PI / 360) * 30} Z`}
                fill="oklch(0.62 0.19 268 / 0.2)"
                stroke="oklch(0.62 0.19 268)"
                strokeWidth="1"
              />
            )}
          </svg>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">焦距 / 视场</div>
        <div className="text-sm font-semibold font-mono">
          {fl !== null ? `${fl}mm` : '—'}
          {fov !== null && <span className="text-muted-foreground text-xs ml-1">·{fov}°</span>}
        </div>
      </div>
    </div>
  );
}
