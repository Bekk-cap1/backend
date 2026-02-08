import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const hasSession = req.cookies.get('admin_session')?.value === '1';
  const role = req.cookies.get('user_role')?.value?.toLowerCase() ?? '';
  const isAllowedRole = role === '' || ['admin', 'moderator', 'superadmin'].includes(role);

  if (!hasSession || !isAllowedRole) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    if (!isAllowedRole) {
      url.searchParams.set('error', 'admin_only');
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|favicon.ico).*)'],
};
