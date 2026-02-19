import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple proxy - just passes through requests
// i18n has been removed, no locale handling needed

export function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
