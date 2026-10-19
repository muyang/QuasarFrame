import { NextResponse } from 'next/server';
import { requireAuth, getUserId } from '@/auth/middleware';
import { cloudPlanInputSchema } from '@/lib/cloud-plan';
import { deletePlan, getPlan, savePlan } from '@/server/plans';

type Context = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Context) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const plan = getPlan(getUserId(session)!, (await params).id);
  if (!plan) return NextResponse.json({ error: '计划不存在' }, { status: 404 });
  return NextResponse.json({ plan }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: Request, { params }: Context) {
  const { error, session } = await requireAuth();
  if (error) return error;
  const id = (await params).id;
  const ownerId = getUserId(session)!;
  if (!getPlan(ownerId, id)) return NextResponse.json({ error: '计划不存在' }, { status: 404 });
  try {
    const parsed = cloudPlanInputSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const plan = savePlan(ownerId, parsed.data, id);
    if (!plan) return NextResponse.json({ error: '地点不存在或示意坐标不匹配' }, { status: 400 });
    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Plan update error:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Context) {
  const { error, session } = await requireAuth();
  if (error) return error;
  if (!deletePlan(getUserId(session)!, (await params).id)) return NextResponse.json({ error: '计划不存在' }, { status: 404 });
  return NextResponse.json({ success: true });
}
