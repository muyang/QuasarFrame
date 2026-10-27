import { getResourceCard } from '@/server/resource-catalog';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const card = getResourceCard((await params).id);
    if (!card) return Response.json({ error: '资源不可用或不存在' }, { status: 404 });
    return Response.json({ card }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Resource card unavailable:', error);
    return Response.json({ error: '资源校验失败' }, { status: 503 });
  }
}
