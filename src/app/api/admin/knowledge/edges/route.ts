import { eq } from 'drizzle-orm';
import { requireRole } from '@/auth/middleware';
import { db } from '@/db';
import { knowledgeNodes, knowledgeEdges } from '@/db/schema';
import { knowledgeEdgeInputSchema } from '@/lib/knowledge';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { error } = await requireRole('admin');
  if (error) return error;
  const parsed = knowledgeEdgeInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { fromId, toId } = parsed.data;
  const from = db.select().from(knowledgeNodes).where(eq(knowledgeNodes.id, fromId)).get();
  const to = db.select().from(knowledgeNodes).where(eq(knowledgeNodes.id, toId)).get();
  if (!from || !to) return Response.json({ error: '关系端点不存在' }, { status: 404 });
  if (parsed.data.status === 'published' && (from.status !== 'published' || to.status !== 'published')) {
    return Response.json({ error: '不能发布指向草稿的关系' }, { status: 409 });
  }
  if (db.select().from(knowledgeEdges).where(eq(knowledgeEdges.id, parsed.data.id)).get()) {
    return Response.json({ error: '关系已存在' }, { status: 409 });
  }
  db.insert(knowledgeEdges).values(parsed.data).run();
  return Response.json({ id: parsed.data.id }, { status: 201 });
}
