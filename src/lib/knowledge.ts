import { z } from 'zod';

export const knowledgeClaimSchema = z.enum(['fact', 'observation', 'inference', 'recommendation']);
export const knowledgeNodeInputSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/).max(120),
  kind: z.enum(['place', 'vantage', 'subject', 'style', 'color', 'composition', 'lighting',
    'makeup', 'equipment', 'geography', 'history', 'culture', 'technique']),
  label: z.string().min(1).max(120),
  description: z.string().min(1).max(3000),
  claimType: knowledgeClaimSchema,
  sourceUrl: z.url().startsWith('https://'),
  sourceLicense: z.string().min(1).max(200),
  status: z.enum(['draft', 'published']).default('draft'),
}).strict();

export const knowledgeEdgeInputSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/).max(120),
  fromId: z.string().min(1),
  toId: z.string().min(1),
  relation: z.enum(['located_at', 'suitable_for', 'uses', 'influenced_by', 'supports',
    'conflicts_with', 'requires', 'complements', 'source_of']),
  claimType: knowledgeClaimSchema,
  sourceUrl: z.url().startsWith('https://'),
  status: z.enum(['draft', 'published']).default('draft'),
}).strict();
