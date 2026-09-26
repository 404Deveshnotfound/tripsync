import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      console.error('Exchange code error:', error.message);
    } catch (err) {
      console.error('Auth callback exception:', err);
    }
  }

  // Redirect to login with error message if exchange failed
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate with Google`);
}
