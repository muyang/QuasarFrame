import { NextResponse } from 'next/server';
import { requireAuth, getUserId } from '@/auth/middleware';
import { cloudPlanInputSchema } from '@/lib/cloud-plan';
import { getCataloguePlace } from '@/server/places';
import { listPlans, savePlan } from '@/server/plans';

export async function GET(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const locationId = new URL(req.url).searchParams.get('locationId') ?? undefined;
  if (locationId && !getCataloguePlace(locationId)) return NextResponse.json({ error: '地点不存在' }, { status: 400 });
  return NextResponse.json({ plans: listPlans(getUserId(session)!, locationId) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: Request) {
  const { error, session } = await requireAuth();
  if (error) return error;
  try {
    const parsed = cloudPlanInputSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const plan = savePlan(getUserId(session)!, parsed.data);
    if (!plan) return NextResponse.json({ error: '地点不存在或示意坐标不匹配' }, { status: 400 });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error('Plan create error:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}
