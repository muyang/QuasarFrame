export type SceneryType =
  | 'starry-sky'
  | 'sea-of-clouds'
  | 'moonrise'
  | 'sunset'
  | 'sunrise'
  | 'mirror-lake'
  | 'autumn-colors'
  | 'snow-peak'
  | 'mist'
  | 'aurora';

export interface CameraPosition {
  azimuth: number;       // degrees 0-360
  elevation: number;     // degrees -10 to +80
  focalLength: number;   // mm
}

export interface Location {
  id: string;
  name: string;
  nameEn: string;
  province: string;
  coordinates: [number, number]; // [lng, lat]
  elevation: number;              // meters
  bestViewingDirections: number[];// azimuth degrees
  bestSeasons: Season[];
  sceneryTags: SceneryType[];
  difficulty: 1 | 2 | 3 | 4 | 5;
  accessibility: string;
  description: string;
  descriptionEn: string;
  heroImage: string;
  photos: string[];
  goldenHourOffset: number;       // minutes before/after official sunrise/set
  notes: string;
  notesEn: string;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SceneryInfo {
  type: SceneryType;
  label: string;
  labelEn: string;
  icon: string;
  description: string;
  descriptionEn: string;
  color: string;
}

export interface ConditionStatus {
  sceneryType: SceneryType;
  probability: number; // 0-1
  label: string;
  labelEn: string;
}
