import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const response = NextResponse.redirect(new URL('/dashboard/compte', request.url))
  response.headers.set('Cache-Control', 'private, no-store')
  if (code) {
    const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: { getAll: () => request.cookies.getAll(), setAll: (cookies: { name: string; value: string; options: CookieOptions }[]) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) },
    })
    const { error } = await client.auth.exchangeCodeForSession(code)
    if (!error) return response
  }
  const failure = NextResponse.redirect(new URL('/dashboard/compte?confirmation=error', request.url))
  response.cookies.getAll().forEach(cookie => failure.cookies.set(cookie))
  failure.headers.set('Cache-Control', 'private, no-store')
  return failure
}
