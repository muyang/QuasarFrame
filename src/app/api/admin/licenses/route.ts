import { desc, eq } from 'drizzle-orm';
import { requireRole } from '@/auth/middleware';
import { db } from '@/db';
import { sourceLicenses, photos } from '@/db/schema';
import { parseDistributionScope } from '@/lib/license';
import { latestSourceLicense } from '@/server/licenses';

export const runtime = 'nodejs';

export async function GET() {
  const { error } = await requireRole('admin');
  if (error) return error;
  const rows = db.select({ license: sourceLicenses, title: photos.title, photoStatus: photos.status })
    .from(sourceLicenses).leftJoin(photos, eq(sourceLicenses.resourceId, photos.id))
    .where(eq(sourceLicenses.status, 'pending')).orderBy(desc(sourceLicenses.createdAt)).limit(100).all();
  return Response.json({ licenses: rows.filter(({ license }) =>
    latestSourceLicense(license.resourceType, license.resourceId)?.id === license.id)
    .map(({ license, title, photoStatus }) => ({
    id: license.id, resourceType: license.resourceType, resourceId: license.resourceId,
    title, photoStatus, ownerId: license.ownerId, version: license.version,
    scope: parseDistributionScope(license.scopeJson), evidenceUrl: license.evidenceUrl,
    createdAt: license.createdAt,
  })) }, { headers: { 'Cache-Control': 'private, no-store' } });
}
