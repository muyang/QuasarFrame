import { NextResponse, type NextRequest } from 'next/server';

// Only metadata-stripped thumbnails may be served from public/uploads.
export function proxy(request: NextRequest) {
  if (/\/[a-f0-9-]{36}_thumb\.(?:jpe?g|png|webp)$/i.test(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  return new NextResponse(null, { status: 404 });
}

export const config = { matcher: '/uploads/:path*' };
