export function redactPhotoPosition<T extends {
  coordinatesLng: number | null; coordinatesLat: number | null;
  azimuth: number | null; elevation: number | null; gpsAccuracy: number | null;
}>(photo: T, permission: { ownsPhoto: boolean; isAdmin: boolean; isUnlocked: boolean; shareCoordinates: boolean }): T {
  if (permission.ownsPhoto || permission.isAdmin || (permission.isUnlocked && permission.shareCoordinates)) return photo;
  return { ...photo, coordinatesLng: null, coordinatesLat: null,
    azimuth: null, elevation: null, gpsAccuracy: null };
}
