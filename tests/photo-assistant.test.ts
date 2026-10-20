import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { normalizePhotoExif, provenanceForSubmission, shootingGuidance } from '../src/lib/photo-evidence';
import { redactPhotoPosition } from '../src/lib/photo-privacy';
import { calibrateRidge, ridgeCalibrationSchema } from '../src/lib/photo-calibration';
import { distanceMeters, horizonFromProfile, pointAtDistance, terrainProfile } from '../src/lib/geo';
import { matchSkyline, skylineMatchSchema } from '../src/lib/skyline-match';
import { analyzePhotoBuffer } from '../src/server/photo-evidence';
import { photoUploadSchema } from '../src/lib/validators';

test('EXIF 保留相机本地时间，磁北朝向不冒充真北，缺 GPS 不推断位置', () => {
  const evidence = normalizePhotoExif({ DateTimeOriginal: '2026:10:20 08:16:33',
    Make: 'Canon', FNumber: 8, ExposureTime: 1 / 250, ISO: 200,
    FocalLength: 35, FocalLengthIn35mmFormat: 53,
    GPSImgDirection: 120, GPSImgDirectionRef: 'M' });
  assert.equal(evidence.shotAtLocal, '2026-10-20T08:16');
  assert.equal(evidence.azimuthDeg, null);
  assert.equal(evidence.coordinates, null);
  assert.equal(evidence.sensorSuggestion, 'apsc');
  assert.ok(evidence.warnings.some((item) => item.includes('磁北')));
  assert.ok(shootingGuidance(evidence).some((item) => item.includes('实测 GPS')));
  assert.equal(normalizePhotoExif({ GPSImgDirection: 90 }).azimuthDeg, null);
  assert.equal(normalizePhotoExif({ ExposureTime: 0.8 }).shutterSpeed, '0.8s');
});

test('服务端能解析没有 EXIF 的真实 JPEG，但不生成假坐标', async () => {
  const buffer = await sharp({ create: { width: 40, height: 30, channels: 3,
    background: { r: 60, g: 100, b: 140 } } }).jpeg().toBuffer();
  const result = await analyzePhotoBuffer(buffer);
  assert.equal(result.width, 40);
  assert.equal(result.height, 30);
  assert.equal(result.evidence.coordinates, null);
  assert.equal(result.evidence.focalLengthMm, null);
});

test('服务端从真实 JPEG EXIF 读取机型而不凭机型猜测位置', async () => {
  const buffer = await sharp({ create: { width: 20, height: 20, channels: 3,
    background: 'white' } }).withExif({ IFD0: { Make: 'Quasar Test', Model: 'Fixture Camera' } }).jpeg().toBuffer();
  const result = await analyzePhotoBuffer(buffer);
  assert.equal(result.evidence.cameraMake, 'Quasar Test');
  assert.equal(result.evidence.cameraModel, 'Fixture Camera');
  assert.equal(result.evidence.coordinates, null);
});

test('上传字段与原始 EXIF 分开记录来源', () => {
  const evidence = normalizePhotoExif({ longitude: 102.35, latitude: 29.9,
    GPSImgDirection: 90, GPSImgDirectionRef: 'T', FocalLength: 35,
    DateTimeOriginal: '2026:10:20 07:00:00' });
  const provenance = provenanceForSubmission({ coordinatesLng: 102.35, coordinatesLat: 29.9,
    azimuth: 92, focalLength: 35, shotAt: '2026-10-20T07:00' }, evidence);
  assert.equal(provenance.coordinates, 'exif');
  assert.equal(provenance.direction, 'manual');
  assert.equal(provenance.settings, 'exif');
  assert.equal(provenance.captureTime, 'exif');
  assert.equal(provenanceForSubmission({ coordinatesLng: 102.36, coordinatesLat: 29.9 }, evidence).coordinates, 'manual');
  assert.equal(photoUploadSchema.parse({ title: 'test' }).shareCoordinates, false);
});

test('付费解锁不会绕过精确机位授权', () => {
  const photo = { coordinatesLng: 102.35, coordinatesLat: 29.9,
    azimuth: 90, elevation: 3, gpsAccuracy: 7, title: 'test' };
  const hidden = redactPhotoPosition(photo, { ownsPhoto: false, isAdmin: false,
    isUnlocked: true, shareCoordinates: false });
  assert.equal(hidden.coordinatesLng, null);
  assert.equal(hidden.azimuth, null);
  assert.equal(hidden.gpsAccuracy, null);
  assert.equal(redactPhotoPosition(photo, { ownsPhoto: false, isAdmin: false,
    isUnlocked: true, shareCoordinates: true }).coordinatesLng, 102.35);
  assert.equal(redactPhotoPosition(photo, { ownsPhoto: false, isAdmin: false,
    isUnlocked: false, shareCoordinates: true }).coordinatesLng, null);
  assert.equal(redactPhotoPosition(photo, { ownsPhoto: true, isAdmin: false,
    isUnlocked: false, shareCoordinates: false }).coordinatesLng, 102.35);
});

test('单点山脊标记只给出理论仰角建议，宽高比或缺样本时失败关闭', () => {
  const origin: [number, number] = [102.3, 29.88];
  const input = ridgeCalibrationSchema.parse({ coordinates: origin, coordinateSource: 'user',
    azimuthDeg: 90, focalLengthMm: 50, sensor: 'fullFrame', portrait: false,
    imageAspect: 1.5, markerX: 0.5, markerY: 0.5, maxDistanceM: 5000 });
  const sample = (lng: number, lat: number) => {
    const distance = distanceMeters(origin, [lng, lat]);
    return distance > 2950 && distance < 3050 ? 400 : 100;
  };
  const result = calibrateRidge(input, sample);
  assert.equal(result.status, 'theoretical');
  if (result.status === 'theoretical') {
    assert.ok(result.suggestedTiltDeg > 5 && result.suggestedTiltDeg < 6);
    assert.equal(result.suggestedTiltDeg, result.ridgeAngleDeg);
  }
  assert.equal(calibrateRidge({ ...input, imageAspect: 4 / 3 }, sample).status, 'aspect_mismatch');
  const gap = (lng: number, lat: number) => distanceMeters(origin, [lng, lat]) > 3500 ? null : sample(lng, lat);
  assert.equal(calibrateRidge(input, gap).status, 'insufficient_data');
  assert.equal(ridgeCalibrationSchema.safeParse({ ...input, markerX: 0.8 }).success, false);
  assert.ok(distanceMeters(origin, pointAtDistance(origin, 90, 3000)) > 2999);
});

test('已知区域的多点山脊可重获合成机位，结果仍标低可信度', () => {
  const origin: [number, number] = [102.3, 29.88];
  const sample = (lng: number, lat: number) => {
    const east = (lng - origin[0]) * 96_000;
    const north = (lat - origin[1]) * 111_000;
    const hill = (centerEast: number, centerNorth: number, height: number) =>
      height * Math.exp(-(((east - centerEast) / 800) ** 2 + ((north - centerNorth) / 650) ** 2));
    return 100 + hill(3500, 1600, 350) + hill(4900, -500, 290) + hill(6200, -2000, 410);
  };
  const xs = [0.1, 0.3, 0.5, 0.7, 0.9];
  const markers = xs.map((x) => {
    const bearing = 90 + Math.atan((x - 0.5) * 36 / 50) * 180 / Math.PI;
    const profile = terrainProfile({ origin, azimuthDeg: bearing, maxDistanceM: 8000,
      stepM: 60, cameraHeightM: 1.6, sample });
    const ridge = horizonFromProfile(profile.points, 2000);
    assert.equal(ridge.status, 'sampled');
    const y = 0.5 - Math.tan(ridge.angleDeg! * Math.PI / 180) * 50 / 24;
    return { x, y };
  });
  const input = skylineMatchSchema.parse({ searchCenter: origin, radiusM: 100,
    gridSide: 5, azimuthDeg: 90, focalLengthMm: 50, sensor: 'fullFrame',
    portrait: false, imageAspect: 1.5, maxDistanceM: 8000, markers });
  const result = matchSkyline(input, sample);
  assert.equal(result.status, 'candidates');
  assert.equal(result.confidence, 'low');
  assert.ok(result.candidates[0].rmsDeg < 0.001);
  assert.ok(distanceMeters(result.candidates[0].coordinates, origin) < 1);
});
