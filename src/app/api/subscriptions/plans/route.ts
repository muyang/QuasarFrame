import { NextResponse } from 'next/server';
import { db } from '@/db';
import { membershipPlans } from '@/db/schema';

// GET all available plans
export async function GET() {
  const plans = await db.select().from(membershipPlans);
  return NextResponse.json(plans);
}
