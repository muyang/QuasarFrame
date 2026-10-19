import { create } from 'zustand';
import type { SensorPreset } from '@/lib/camera-optics';

interface CameraStore {
  sensor: SensorPreset;
  portrait: boolean;
  setSensor: (sensor: SensorPreset) => void;
  setPortrait: (portrait: boolean) => void;
  azimuth: number;
  elevation: number;
  focalLength: number;
  setAzimuth: (deg: number) => void;
  setElevation: (deg: number) => void;
  setFocalLength: (mm: number) => void;
  reset: () => void;
}

export const useCameraStore = create<CameraStore>((set) => ({
  sensor: 'fullFrame',
  portrait: false,
  setSensor: (sensor) => set({ sensor }),
  setPortrait: (portrait) => set({ portrait }),
  azimuth: 180,
  elevation: 15,
  focalLength: 35,
  setAzimuth: (deg) => set({ azimuth: deg }),
  setElevation: (deg) => set({ elevation: Math.max(-10, Math.min(80, deg)) }),
  setFocalLength: (mm) => { if (Number.isFinite(mm)) set({ focalLength: Math.max(1, Math.min(2000, mm)) }); },
  reset: () => set({ azimuth: 180, elevation: 15, focalLength: 35, sensor: 'fullFrame', portrait: false }),
}));
