import { NextResponse } from 'next/server';
import { requireAuth } from '@/auth/middleware';
import { listIllustrativePlaces } from '@/server/places';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;
  return NextResponse.json({ places: listIllustrativePlaces() }, { headers: { 'Cache-Control': 'no-store' } });
}
