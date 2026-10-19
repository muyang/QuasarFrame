import type { SceneryType } from '@/types/location';
import type { Location } from '@/types/location';

/**
 * Deterministic pseudo-random condition simulator.
 * Seeded by time + location + season to produce realistic weather/scenery probabilities.
 * Designed to be replaced with real API data in production.
 */

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getSeed(locationId: string, date: Date, sceneryType: string): number {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const hourOfDay = date.getHours();
  const idSum = locationId.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const scenerySum = sceneryType.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return idSum * 31 + scenerySum * 17 + dayOfYear * 7 + hourOfDay;
}

interface ConditionResult {
  probability: number; // 0-1
  label: string;
  labelEn: string;
  isGood: boolean;
}

export function simulateCondition(
  location: Location,
  sceneryType: SceneryType,
  date: Date = new Date()
): ConditionResult {
  const seed = getSeed(location.id, date, sceneryType);
  let baseProb = seededRandom(seed);

  // Apply seasonal modifiers
  const month = date.getMonth(); // 0-11
  const hour = date.getHours();

  switch (sceneryType) {
    case 'starry-sky':
      // Better in summer/autumn, worse in monsoon season
      baseProb *= month >= 4 && month <= 9 ? 1.3 : 0.7;
      // Must be night time
      if (hour >= 6 && hour <= 18) baseProb *= 0.1;
      // High elevation bonus
      baseProb *= 1 + (location.elevation - 1000) / 5000;
      break;
    case 'sea-of-clouds':
      // Better in spring/winter, after rain
      baseProb *= (month >= 0 && month <= 3) || (month >= 9 && month <= 11) ? 1.4 : 0.6;
      // Better at dawn
      if (hour >= 5 && hour <= 8) baseProb *= 1.5;
      // High elevation bonus
      baseProb *= 1 + location.elevation / 8000;
      break;
    case 'sunset':
    case 'sunrise':
      // Generally good year round
      baseProb *= 0.8 + seededRandom(seed + 1) * 0.4;
      break;
    case 'mirror-lake':
      // Needs calm weather, better in summer
      baseProb *= month >= 5 && month <= 9 ? 1.2 : 0.8;
      // Morning is best (less wind)
      if (hour >= 5 && hour <= 9) baseProb *= 1.3;
      break;
    case 'moonrise':
      // Depends on moon phase
      baseProb *= 0.6 + seededRandom(seed + 2) * 0.6;
      if (hour >= 6 && hour <= 18) baseProb *= 0.2;
      break;
    case 'autumn-colors':
      // Only in autumn
      baseProb *= month >= 8 && month <= 10 ? 1.8 : 0.2;
      break;
    case 'snow-peak':
      // Better in autumn/winter
      baseProb *= (month >= 9 && month <= 11) || (month >= 0 && month <= 2) ? 1.5 : 0.5;
      break;
    case 'mist':
      // After rain, early morning
      baseProb *= hour >= 4 && hour <= 8 ? 1.5 : 0.4;
      baseProb *= month >= 3 && month <= 8 ? 1.2 : 0.7;
      break;
    case 'aurora':
      // Very rare at these latitudes
      baseProb *= 0.05;
      break;
  }

  const probability = Math.min(1, Math.max(0, baseProb));
  const isGood = probability > 0.6;

  let label: string;
  let labelEn: string;
  if (probability > 0.8) {
    label = '极佳';
    labelEn = 'Excellent';
  } else if (probability > 0.6) {
    label = '良好';
    labelEn = 'Good';
  } else if (probability > 0.4) {
    label = '一般';
    labelEn = 'Fair';
  } else {
    label = '不佳';
    labelEn = 'Poor';
  }

  return { probability, label, labelEn, isGood };
}

/** Get the best current scenery type for a location */
export function getBestCurrentScenery(location: Location): {
  type: SceneryType;
  condition: ConditionResult;
} {
  const now = new Date();
  const results = location.sceneryTags.map((type) => ({
    type,
    condition: simulateCondition(location, type, now),
  }));
  results.sort((a, b) => b.condition.probability - a.condition.probability);
  return results[0];
}

/** Get recommended locations for right now */
export function getRecommendedLocations(locations: Location[]): Location[] {
  const now = new Date();
  return locations
    .map((loc) => {
      const best = getBestCurrentScenery(loc);
      return { location: loc, score: best.condition.probability };
    })
    .sort((a, b) => b.score - a.score)
    .map((r) => r.location);
}
