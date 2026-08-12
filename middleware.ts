import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const roleRoutes: Record<string, string> = {
  owner: '/owner',
  admin_pusat: '/admin-pusat',
  admin_cabang: '/admin-cabang',
  mekanik: '/mekanik',
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // halaman login tetap bisa diakses tanpa login
  if (path === '/login') {
    return response;
  }

  // belum login -> tendang ke halaman login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // sudah login, cek role-nya cocok gak sama folder yang diakses
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const allowedPrefix = profile?.role ? roleRoutes[profile.role] : null;

  if (!allowedPrefix || !path.startsWith(allowedPrefix)) {
    // role gak cocok sama halaman yang mau diakses -> tendang balik ke login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/owner/:path*',
    '/admin-pusat/:path*',
    '/admin-cabang/:path*',
    '/mekanik/:path*',
  ],
};