import { z } from 'zod';

export const mapViewportSchema = z.object({
  center: z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-85.051129).max(85.051129)]),
  zoom: z.number().finite().min(0).max(18),
  bearing: z.number().finite().min(-360).max(360),
  pitch: z.number().finite().min(0).max(85),
});
export const workspaceSchema = z.object({
  version: z.literal(1),
  intent: z.enum(['landscape', 'astro']),
  projection: z.enum(['globe', 'mercator']),
  viewport: mapViewportSchema,
}).strict();
export type ShootingWorkspace = z.infer<typeof workspaceSchema>;
export type MapViewport = z.infer<typeof mapViewportSchema>;
export const NASA_TILE_URL = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg';
export const NASA_SOURCE_URL = 'https://gibs.earthdata.nasa.gov/layer-metadata/v1.0/BlueMarble_ShadedRelief_Bathymetry.json';

/** Check the frame identity as well as origin: a sibling frame is not trusted. */
export function trustedMapEvent(event: Pick<MessageEvent, 'origin' | 'source' | 'data'>, origin: string, target: MessageEventSource | null) {
  if (!target || event.origin !== origin || event.source !== target) return null;
  const parsed = z.object({ v: z.literal(2), source: z.literal('geolibre'), type: z.enum(['ready', 'ack', 'viewChanged', 'projectLoaded']), payload: z.record(z.string(), z.unknown()) }).safeParse(event.data);
  return parsed.success ? parsed.data : null;
}
