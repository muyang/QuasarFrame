import { z } from 'zod';
import { permitsDelivery, type DeliveryChannel, type LicenseState } from './license';

export const entitlementChannelsSchema = z.array(z.enum(['web', 'mobile', 'tv', 'frame'])).min(1).max(4);

export function availableChannels(
  channelsJson: string, revokedAt: string | null, license: LicenseState | null,
): DeliveryChannel[] {
  if (revokedAt) return [];
  let channels: DeliveryChannel[];
  try { channels = entitlementChannelsSchema.parse(JSON.parse(channelsJson)); }
  catch { return []; }
  return [...new Set(channels)].filter((channel) => permitsDelivery(license, channel, 'paid'));
}
