// Map & Globe defaults
export const CHINA_CENTER = { lng: 105, lat: 35, height: 4_000_000 };
export const DEFAULT_ZOOM = 8;

// Fallback city coordinates for LBS
export const PRESET_CITIES: Record<string, { name: string; nameEn: string; coordinates: [number, number] }> = {
  chengdu: { name: '成都', nameEn: 'Chengdu', coordinates: [104.07, 30.57] },
  xian: { name: '西安', nameEn: "Xi'an", coordinates: [108.94, 34.27] },
  kunming: { name: '昆明', nameEn: 'Kunming', coordinates: [102.68, 25.04] },
  hangzhou: { name: '杭州', nameEn: 'Hangzhou', coordinates: [120.15, 30.29] },
  beijing: { name: '北京', nameEn: 'Beijing', coordinates: [116.40, 39.90] },
  shanghai: { name: '上海', nameEn: 'Shanghai', coordinates: [121.47, 31.23] },
  guangzhou: { name: '广州', nameEn: 'Guangzhou', coordinates: [113.26, 23.13] },
  chongqing: { name: '重庆', nameEn: 'Chongqing', coordinates: [106.55, 29.56] },
};

// Focal length presets (full-frame 35mm sensor)
export const FOCAL_PRESETS = [
  { label: '14mm', value: 14, type: '超广角' },
  { label: '24mm', value: 24, type: '广角' },
  { label: '35mm', value: 35, type: '人文' },
  { label: '50mm', value: 50, type: '标准' },
  { label: '85mm', value: 85, type: '人像' },
  { label: '135mm', value: 135, type: '中长焦' },
  { label: '200mm', value: 200, type: '长焦' },
];

// Sensor size for FOV calculation (full-frame)
export const SENSOR_SIZE_MM = 36;

// Colors for scenery markers on globe
export const SCENERY_MARKER_COLORS: Record<string, string> = {
  'starry-sky': '#818cf8',
  'sea-of-clouds': '#94a3b8',
  'moonrise': '#c4b5fd',
  'sunset': '#fb923c',
  'sunrise': '#fbbf24',
  'mirror-lake': '#38bdf8',
  'autumn-colors': '#d97706',
  'snow-peak': '#e2e8f0',
  'mist': '#cbd5e1',
  'aurora': '#34d399',
};
