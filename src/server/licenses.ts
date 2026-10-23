import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { sourceLicenses } from '@/db/schema';
import { parseDistributionScope, permitsDelivery, type DeliveryChannel } from '@/lib/license';

export function latestSourceLicense(resourceType: 'photo' | 'feed' | 'bundle', resourceId: string) {
  return db.select().from(sourceLicenses).where(and(
    eq(sourceLicenses.resourceType, resourceType), eq(sourceLicenses.resourceId, resourceId),
  )).orderBy(desc(sourceLicenses.version)).get() ?? null;
}

export function licensedFor(
  resourceType: 'photo' | 'feed' | 'bundle', resourceId: string,
  channel: DeliveryChannel, use: 'preview' | 'view' | 'paid' | 'download' | 'derivative',
): boolean {
  const row = latestSourceLicense(resourceType, resourceId);
  const scope = row ? parseDistributionScope(row.scopeJson) : null;
  return permitsDelivery(row && scope ? { status: row.status, scope } : null, channel, use);
}
