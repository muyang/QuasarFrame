import { eq } from 'drizzle-orm';
import { requireRole } from '@/auth/middleware';
import { db } from '@/db';
import { knowledgeNodes } from '@/db/schema';
import { knowledgeNodeInputSchema } from '@/lib/knowledge';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { error } = await requireRole('admin');
  if (error) return error;
  const parsed = knowledgeNodeInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const prior = db.select().from(knowledgeNodes).where(eq(knowledgeNodes.id, parsed.data.id)).get();
  if (prior) return Response.json({ error: '节点已存在；请通过版本化编辑更新' }, { status: 409 });
  db.insert(knowledgeNodes).values(parsed.data).run();
  return Response.json({ id: parsed.data.id }, { status: 201 });
}
