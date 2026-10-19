import { NextResponse } from 'next/server';
import { requireAuth, getUserId } from '@/auth/middleware';
import { legacyImportSchema } from '@/lib/cloud-plan';
import { importLegacyPlans } from '@/server/plans';

export async function POST(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;
  try {
    const parsed = legacyImportSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    return NextResponse.json(importLegacyPlans(getUserId(session)!, parsed.data.plans));
  } catch (error) {
    console.error('Plan import error:', error);
    return NextResponse.json({ error: '导入失败' }, { status: 500 });
  }
}
