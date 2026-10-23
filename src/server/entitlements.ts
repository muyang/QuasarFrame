import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { entitlementGrants } from '@/db/schema';
import { availableChannels } from '@/lib/entitlement';
import { parseDistributionScope, type DeliveryChannel } from '@/lib/license';
import { latestSourceLicense } from './licenses';

export function hasEntitlement(
  userId: string, resourceType: 'photo' | 'feed' | 'bundle', resourceId: string, channel: DeliveryChannel,
): boolean {
  const license = latestSourceLicense(resourceType, resourceId);
  const scope = license ? parseDistributionScope(license.scopeJson) : null;
  const grants = db.select().from(entitlementGrants).where(and(
    eq(entitlementGrants.userId, userId), eq(entitlementGrants.resourceType, resourceType),
    eq(entitlementGrants.resourceId, resourceId),
  )).all();
  return grants.some((grant) => grant.licenseId === license?.id && availableChannels(grant.channelsJson, grant.revokedAt,
    license && scope ? { status: license.status, scope } : null).includes(channel));
}
