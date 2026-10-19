'use client';

import { useCameraStore } from '@/stores/useCameraStore';
import { FOCAL_PRESETS } from '@/lib/constants';
import { getLensType, getCameraView, SENSOR_PRESETS, type SensorPreset } from '@/lib/camera-optics';
import { RotateCw } from 'lucide-react';

export function CameraControls() {
  const azimuth = useCameraStore((s) => s.azimuth);
  const elevation = useCameraStore((s) => s.elevation);
  const focalLength = useCameraStore((s) => s.focalLength);
  const setAzimuth = useCameraStore((s) => s.setAzimuth);
  const setElevation = useCameraStore((s) => s.setElevation);
  const setFocalLength = useCameraStore((s) => s.setFocalLength);
  const reset = useCameraStore((s) => s.reset);

  const { sensor, portrait, setSensor, setPortrait } = useCameraStore();
  const view = getCameraView(focalLength, sensor, portrait);
  const fov = view.horizontalFov;
  const lensType = getLensType(view.equivalentFocalLength);

  return (
    <div className="space-y-5">
      <label className="block text-xs text-muted-foreground">传感器
        <select aria-label="传感器" value={sensor} onChange={(event) => setSensor(event.target.value as SensorPreset)} className="block w-full bg-card border border-border rounded-lg p-2 mt-2">
          {Object.entries(SENSOR_PRESETS).map(([key, value]) => <option key={key} value={key}>{value.name}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={portrait} onChange={(event) => setPortrait(event.target.checked)} />竖拍</label>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">机位控制</p>
        <button
          onClick={reset}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <RotateCw className="w-3 h-3" />
          重置
        </button>
      </div>

      {/* Azimuth */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">方位角</span>
          <span className="font-mono">{azimuth}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={azimuth}
          onChange={(e) => setAzimuth(parseInt(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary bg-muted"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
          <span>北</span>
          <span>东</span>
          <span>南</span>
          <span>西</span>
          <span>北</span>
        </div>
      </div>

      {/* Elevation */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">仰角</span>
          <span className="font-mono">{elevation}°</span>
        </div>
        <input
          type="range"
          min={-10}
          max={80}
          step={1}
          value={elevation}
          onChange={(e) => setElevation(parseInt(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary bg-muted"
        />
      </div>

      {/* Focal Length */}
      <div>
        <div className="flex justify-between text-xs mb-2">
          <span className="text-muted-foreground">实际焦距</span>
          <span className="font-mono">
            {focalLength}mm · {lensType}
          </span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FOCAL_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setFocalLength(preset.value)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all ${
                focalLength === preset.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <label className="block text-xs text-muted-foreground mt-2">自定义焦距（mm）
          <input aria-label="实际焦距" type="number" min={1} max={2000} step={1} value={focalLength} onChange={(event) => { if (event.target.value) setFocalLength(Number(event.target.value)); }} className="w-full bg-card border border-border rounded-lg p-2 mt-1" />
        </label>
      </div>

      {/* FOV display */}
      <div className="rounded-lg bg-card/50 p-3 border border-border/20">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">水平 / 垂直视场</span>
          <span className="font-mono">{fov.toFixed(1)}° / {view.verticalFov.toFixed(1)}°</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">等效焦距 {view.equivalentFocalLength.toFixed(1)}mm · 按直线投影镜头估算</p>
        {/* FOV visualization */}
        <div className="mt-2 h-16 flex items-center justify-center">
          <div
            className="h-full border-l-2 border-r-2 border-primary/30 bg-primary/5"
            style={{
              width: `${Math.min(100, fov * 1.2)}%`,
              clipPath: `polygon(50% 0%, 0% 100%, 100% 100%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
