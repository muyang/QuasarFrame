import { db } from '../src/db';
import { knowledgeNodes, knowledgeEdges } from '../src/db/schema';
import { knowledgeNodeInputSchema, knowledgeEdgeInputSchema } from '../src/lib/knowledge';

const sourceUrl = 'https://github.com/muyang/QuasarFrame/blob/main/docs/geonexus-inspired-refactor-plan-2026-10-22.md';
const sourceLicense = 'QuasarFrame editorial; recommendation, not field-verified fact';

const nodes = [
  { id: 'style.cinematic-landscape', kind: 'style', label: '电影感风光', description: '把明暗层次、色彩关系和主体位置作为创作选择；不把风格判断当成地理事实。' },
  { id: 'color.warm-cool', kind: 'color', label: '冷暖对比', description: '可把暖色主体与冷色环境作为一种表达方案；现场光色与白平衡仍需试拍确认。' },
  { id: 'composition.foreground-depth', kind: 'composition', label: '前景层次', description: '可尝试用前景、中景、远景组织画面；遮挡与视场需在真实机位复核。' },
  { id: 'lighting.side-back', kind: 'lighting', label: '侧逆光', description: '可观察侧后方光线如何描绘轮廓；曝光与眩光需随实际天气调整。' },
  { id: 'equipment.telephoto', kind: 'equipment', label: '长焦镜头', description: '可用于取景较窄的远景构图；具体视场取决于焦距与传感器尺寸。' },
  { id: 'technique.field-check', kind: 'technique', label: '现场核验', description: '拍摄建议应对照实测机位、实际地形、天气和取景器画面再采用。' },
] as const;

const edges = [
  { id: 'relation.cinematic-warm-cool', fromId: 'style.cinematic-landscape', toId: 'color.warm-cool', relation: 'uses' },
  { id: 'relation.cinematic-depth', fromId: 'style.cinematic-landscape', toId: 'composition.foreground-depth', relation: 'uses' },
  { id: 'relation.landscape-light', fromId: 'style.cinematic-landscape', toId: 'lighting.side-back', relation: 'uses' },
  { id: 'relation.telephoto-field', fromId: 'equipment.telephoto', toId: 'technique.field-check', relation: 'requires' },
] as const;

for (const node of nodes) {
  const parsed = knowledgeNodeInputSchema.parse({ ...node, claimType: 'recommendation', sourceUrl, sourceLicense, status: 'published' });
  db.insert(knowledgeNodes).values(parsed).onConflictDoNothing().run();
}
for (const edge of edges) {
  const parsed = knowledgeEdgeInputSchema.parse({ ...edge, claimType: 'recommendation', sourceUrl, status: 'published' });
  db.insert(knowledgeEdges).values(parsed).onConflictDoNothing().run();
}
console.log(`Seeded ${nodes.length} editorial concepts and ${edges.length} sourced relations.`);
