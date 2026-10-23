import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { requireRole, getUserId } from '@/auth/middleware';
import { db } from '@/db';
import { sourceLicenses } from '@/db/schema';
import { latestSourceLicense } from '@/server/licenses';
import { parseDistributionScope } from '@/lib/license';

export const runtime = 'nodejs';

const reviewSchema = z.object({ decision: z.enum(['approved', 'rejected']) }).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, session } = await requireRole('admin');
  if (error) return error;
  const parsed = reviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const row = db.select().from(sourceLicenses).where(eq(sourceLicenses.id, (await params).id)).get();
  if (!row) return Response.json({ error: '授权申请不存在' }, { status: 404 });
  if (row.status !== 'pending' || latestSourceLicense(row.resourceType, row.resourceId)?.id !== row.id) {
    return Response.json({ error: '只能审核当前版本的待审授权' }, { status: 409 });
  }
  if (parsed.data.decision === 'approved' && !parseDistributionScope(row.scopeJson)) {
    return Response.json({ error: '授权范围格式无效' }, { status: 422 });
  }
  db.update(sourceLicenses).set({
    status: parsed.data.decision, reviewedBy: getUserId(session)!, reviewedAt: new Date().toISOString(),
  }).where(eq(sourceLicenses.id, row.id)).run();
  return Response.json({ id: row.id, status: parsed.data.decision });
}
