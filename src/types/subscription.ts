import type { SceneryType, Season } from './location';

export type NotificationFrequency = 'instant' | 'daily' | 'weekly';

export interface Subscription {
  id: string;
  sceneryTypes: SceneryType[];
  radius: number;          // km
  maxDifficulty: number;   // 1-5
  preferredSeasons: Season[];
  frequency: NotificationFrequency;
  centerCity?: string;
  centerCoords?: [number, number];
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  titleEn: string;
  message: string;
  messageEn: string;
  locationId: string;
  sceneryType: SceneryType;
  timestamp: string;
  conditionScore: number; // 0-1
}
