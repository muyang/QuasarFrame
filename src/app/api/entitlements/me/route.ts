import { eq } from 'drizzle-orm';
import { requireAuth, getUserId } from '@/auth/middleware';
import { db } from '@/db';
import { entitlementGrants } from '@/db/schema';
import { availableChannels } from '@/lib/entitlement';
import { parseDistributionScope } from '@/lib/license';
import { latestSourceLicense } from '@/server/licenses';

export const runtime = 'nodejs';

export async function GET() {
  const { error, session } = await requireAuth();
  if (error) return error;
  const grants = db.select().from(entitlementGrants).where(eq(entitlementGrants.userId, getUserId(session)!)).all();
  return Response.json({ entitlements: grants.map((grant) => {
    const row = latestSourceLicense(grant.resourceType, grant.resourceId);
    const scope = row ? parseDistributionScope(row.scopeJson) : null;
    const channels = availableChannels(grant.channelsJson, grant.revokedAt,
      row && row.id === grant.licenseId && scope ? { status: row.status, scope } : null);
    return {
      id: grant.id, resourceType: grant.resourceType, resourceId: grant.resourceId,
      channels, status: channels.length ? 'active' : 'unavailable',
      sourceLicenseVersion: row?.version ?? null, purchaseId: grant.purchaseId,
    };
  }) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
