import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_PATHS = ['/login', '/logout', '/consent', '/static', '/assets', '/error', '/_next', '/api'];
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (pathname === '/') return NextResponse.next();

    const isAllowed = ALLOWED_PATHS.some(path => pathname.startsWith(path));

    if (!isAllowed) {
        return new NextResponse(null, { status: 404 });
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next|favicon.ico|mascot.png|mascot_closed.png).*)',
    ],
}