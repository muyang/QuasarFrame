import { z } from 'zod';

export const distributionScopeSchema = z.object({
  web: z.boolean(),
  mobile: z.boolean(),
  tv: z.boolean(),
  frame: z.boolean(),
  paid: z.boolean(),
  derivative: z.boolean(),
  download: z.boolean(),
}).strict();

export type DistributionScope = z.infer<typeof distributionScopeSchema>;
export type DeliveryChannel = 'web' | 'mobile' | 'tv' | 'frame';
export type LicenseState = { status: 'pending' | 'approved' | 'rejected' | 'revoked'; scope: DistributionScope };

export const noDistribution: DistributionScope = {
  web: false, mobile: false, tv: false, frame: false,
  paid: false, derivative: false, download: false,
};

/** Every delivery checks source permission independently of a buyer's entitlement. */
export function permitsDelivery(
  license: LicenseState | null,
  channel: DeliveryChannel,
  use: 'preview' | 'view' | 'paid' | 'download' | 'derivative',
): boolean {
  if (!license || license.status !== 'approved' || !license.scope[channel]) return false;
  if (use === 'paid' && !license.scope.paid) return false;
  if (use === 'download' && !license.scope.download) return false;
  if (use === 'derivative' && !license.scope.derivative) return false;
  return true;
}

export function parseDistributionScope(json: string): DistributionScope | null {
  try {
    const parsed = distributionScopeSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
