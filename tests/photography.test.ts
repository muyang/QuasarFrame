import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSunMoonData, getSunPath, isGoldenHour, formatTime } from '../src/lib/astronomy';
import { dateKeyAtLocation, locationDateTime, minutesAtLocation, formatMinutes } from '../src/lib/location-time';
import { calculateDof, focalLengthToFov, getCameraView, getLensType } from '../src/lib/camera-optics';
import { shootingPlanSchema, suggestedDeparture, planToGpx, angularSeparation, findAlignmentWindows } from '../src/lib/shooting-plan';

const plan = shootingPlanSchema.parse({
  version: 1, locationId: 'chengdu-test', name: '测试 <计划> & 机位', coordinates: [104.07, 30.57],
  coordinateSource: 'user', coordinateSystem: 'WGS84-assumed', dateKey: '2026-09-28', minutes: 60,
  timeZone: 'Asia/Shanghai', focalLength: 50, sensor: 'fullFrame', portrait: false, azimuth: 180, elevation: 15,
  travelMinutes: 120, setupMinutes: 30, notes: '',
});

test('地点日期和时间不依赖运行机器时区，跨日边界正确', () => {
  const midnight = locationDateTime('2026-09-28', 0);
  assert.equal(midnight.toISOString(), '2026-09-27T16:00:00.000Z');
  assert.equal(dateKeyAtLocation(midnight), '2026-09-28');
  assert.equal(minutesAtLocation(midnight), 0);
  assert.equal(locationDateTime('2026-09-28', 1439).toISOString(), '2026-09-28T15:59:00.000Z');
  assert.equal(dateKeyAtLocation(locationDateTime('2026-09-28', 1440)), '2026-09-29');
  assert.equal(formatMinutes(1439), '23:59');
});

test('日出/日落事件不随滑块改变日期，太阳高度随选定时间改变', () => {
  const morning = getSunMoonData(30.57, 104.07, locationDateTime('2026-09-28', 0));
  const noon = getSunMoonData(30.57, 104.07, locationDateTime('2026-09-28', 780));
  assert.equal(morning.sunrise?.getTime(), noon.sunrise?.getTime());
  assert.ok(morning.sunPosition.altitude < 0);
  assert.ok(noon.sunPosition.altitude > 30);
  assert.ok(noon.sunPosition.altitude < 90);
  assert.ok(noon.sunPosition.azimuth >= 0 && noon.sunPosition.azimuth < 360);
  assert.ok(noon.moonPosition.altitude >= -90 && noon.moonPosition.altitude <= 90);
  assert.equal(dateKeyAtLocation(noon.sunrise!), '2026-09-28');
  assert.equal(dateKeyAtLocation(noon.sunset!), '2026-09-28');
});

test('晨晚黄金时段有序，正午不处于黄金时段，蓝调位于日出前/日落后', () => {
  const data = getSunMoonData(30.57, 104.07, locationDateTime('2026-09-28', 720));
  assert.ok(data.goldenHourStart! < data.goldenHourEnd!);
  assert.ok(data.goldenHourEnd! < data.goldenHourStartEvening!);
  assert.ok(data.goldenHourStartEvening! < data.goldenHourEndEvening!);
  assert.equal(isGoldenHour(data, new Date((data.goldenHourStart!.getTime() + data.goldenHourEnd!.getTime()) / 2)), true);
  assert.equal(isGoldenHour(data, data.solarNoon!), false);
  assert.ok(data.blueHourMorning[0]! < data.blueHourMorning[1]!);
  assert.ok(data.blueHourMorning[1]! < data.sunrise!);
  assert.ok(data.blueHourEvening[0]! > data.sunset!);
});

test('高纬无日出日落时安全返回空事件，全天轨迹仍可计算', () => {
  const date = locationDateTime('2026-06-21', 720, 'UTC');
  const data = getSunMoonData(89, 0, date, 'UTC');
  assert.equal(data.sunrise, null);
  assert.equal(data.sunset, null);
  assert.equal(formatTime(data.sunrise), '--:--');
  const path = getSunPath([0, 89], date, 'UTC');
  assert.equal(path.length, 145);
  assert.ok(path.every((point) => Number.isFinite(point.altitude) && point.altitude >= -90 && point.altitude <= 90));
});

test('50mm 全画幅视场、横竖拍交换及小传感器裁切正确', () => {
  const landscape = getCameraView(50, 'fullFrame', false);
  assert.ok(Math.abs(landscape.horizontalFov - 39.598) < 0.01);
  assert.ok(Math.abs(landscape.verticalFov - 26.991) < 0.01);
  assert.equal(focalLengthToFov(50), landscape.verticalFov);
  const portrait = getCameraView(50, 'fullFrame', true);
  assert.equal(portrait.horizontalFov, landscape.verticalFov);
  assert.equal(portrait.verticalFov, landscape.horizontalFov);
  const crop = getCameraView(50, 'apsc', false);
  assert.ok(crop.horizontalFov < landscape.horizontalFov);
  assert.ok(crop.equivalentFocalLength > 50);
  assert.notEqual(getLensType(14), '鱼眼');
});

test('景深输入米和输出米一致，超焦距之外远界无限', () => {
  const depth = calculateDof(50, 8, 10);
  assert.ok(depth.near > 5 && depth.near < 6);
  assert.ok(depth.far > 40 && depth.far < 50);
  assert.equal(calculateDof(50, 8, 100).far, Infinity);
});

test('出发估算跨越前一天，未知行程不产生虚假时间', () => {
  const departure = suggestedDeparture(plan)!;
  assert.equal(dateKeyAtLocation(departure), '2026-09-27');
  assert.equal(formatTime(departure), '22:30');
  assert.equal(suggestedDeparture({ ...plan, travelMinutes: null }), null);
});

test('计划校验拒绝非法日期和坐标，GPX 转义名称并标记未核验', () => {
  assert.equal(shootingPlanSchema.safeParse({ ...plan, dateKey: '2026-02-30' }).success, false);
  assert.equal(shootingPlanSchema.safeParse({ ...plan, coordinates: [181, 0] }).success, false);
  const gpx = planToGpx(plan);
  assert.ok(gpx.includes('&lt;计划&gt; &amp;'));
  assert.ok(gpx.includes('lat="30.57" lon="104.07"'));
  assert.ok(gpx.includes('不是导航路线'));
});

test('天体角距跨越正北正确，天顶不依赖方位', () => {
  assert.ok(Math.abs(angularSeparation(359, 0, 1, 0) - 2) < 0.00001);
  assert.ok(angularSeparation(0, 90, 180, 90) < 0.00001);
});

test('对齐搜索找到已知太阳方向，返回有序且满足容差的窗口', () => {
  const date = locationDateTime(plan.dateKey, 780);
  const sun = getSunMoonData(plan.coordinates[1], plan.coordinates[0], date).sunPosition;
  const windows = findAlignmentWindows({ ...plan, azimuth: sun.azimuth, elevation: sun.altitude }, 'sun', 0.1);
  assert.ok(windows.length > 0);
  assert.ok(windows.some((window) => Math.abs(window.best.getTime() - date.getTime()) <= 60000));
  assert.ok(windows.every((window) => window.start <= window.best && window.best <= window.end && window.separation <= 0.1));
});
