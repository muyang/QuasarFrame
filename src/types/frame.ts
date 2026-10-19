export type FrameStyleId = 'minimalist-wood' | 'modern-black' | 'gallery-white';

export interface FrameStyle {
  id: FrameStyleId;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  frameColor: string;
  matColor: string;
  bezelWidth: number;     // relative units
  price: number;
  sizes: string[];
  previewImage: string;
}

export interface SlideshowConfig {
  interval: number;       // ms between slides
  transitionDuration: number; // ms for crossfade
  kenBurnsZoom: number;   // zoom factor (e.g. 1.1 = 10% zoom)
  kenBurnsPanSpeed: number; // pixels per second
}
