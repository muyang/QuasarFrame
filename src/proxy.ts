import { NextResponse } from 'next/server';

// Legacy public URLs are blocked; thumbnails are served through the licensed API.
export function proxy() {
  return new NextResponse(null, { status: 404 });
}

export const config = { matcher: '/uploads/:path*' };
