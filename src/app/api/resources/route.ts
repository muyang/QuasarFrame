import { listResourceCatalog } from '@/server/resource-catalog';

export const runtime = 'nodejs';

export async function GET() {
  return Response.json(listResourceCatalog(), { headers: { 'Cache-Control': 'no-store' } });
}
