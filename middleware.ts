import { NextRequest, NextResponse } from 'next/server';

// Password gate for the admin panel: everything under /admin requires the
// menu_admin cookie, except the login page itself.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (req.cookies.get('menu_admin')?.value !== '1') {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
