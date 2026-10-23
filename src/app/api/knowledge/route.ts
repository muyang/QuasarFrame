import { and, eq, inArray, like, or } from 'drizzle-orm';
import { db } from '@/db';
import { knowledgeNodes, knowledgeEdges } from '@/db/schema';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (query.length > 80) return Response.json({ error: '查询过长' }, { status: 400 });
  const nodes = db.select().from(knowledgeNodes).where(and(
    eq(knowledgeNodes.status, 'published'),
    query ? or(like(knowledgeNodes.label, `%${query}%`), like(knowledgeNodes.description, `%${query}%`)) : undefined,
  )).limit(30).all();
  const ids = nodes.map((node) => node.id);
  const edges = ids.length ? db.select().from(knowledgeEdges).where(and(
    eq(knowledgeEdges.status, 'published'), inArray(knowledgeEdges.fromId, ids), inArray(knowledgeEdges.toId, ids),
  )).limit(100).all() : [];
  return Response.json({ nodes, edges, provenanceRequired: true }, { headers: { 'Cache-Control': 'no-store' } });
}
