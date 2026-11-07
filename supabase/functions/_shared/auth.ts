// 1UP Anime — shared auth for moderation Edge Functions.
// Runs on Supabase Edge Runtime (Deno). Uses the service_role key from the
// function's secrets: never expose it to the browser.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.117.3';

export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Response(JSON.stringify({ error: 'Server not configured.' }), { status: 500 });
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function badRequest(message: string): Response {
  return json({ error: message }, 400);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

// Verifies the caller's JWT (from the Authorization header) and requires an
// owner/moderator row in public.oneup_admin_roles. Throws a Response on failure.
export async function requireModerator(req: Request, ownerOnly = false): Promise<{
  supa: SupabaseClient;
  userId: string;
  role: string;
}> {
  const supa = adminClient();
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) throw json({ error: 'Sign in required.' }, 401);
  const { data: { user }, error } = await supa.auth.getUser(token);
  if (error || !user) throw json({ error: 'Sign in required.' }, 401);
  if ((user as { is_anonymous?: boolean }).is_anonymous) {
    throw json({ error: 'A 1UP account is required.' }, 403);
  }
  const { data: roleRow } = await supa
    .from('oneup_admin_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();
  const role = (roleRow as { role?: string } | null)?.role;
  if (!role || !['owner', 'moderator'].includes(role)) {
    throw json({ error: 'Moderation access required.' }, 403);
  }
  if (ownerOnly && role !== 'owner') {
    throw json({ error: 'Only the owner can do this.' }, 403);
  }
  return { supa, userId: user.id, role };
}

// Wraps a handler: POST + JSON body, Response errors pass through.
export function handler(
  fn: (req: Request, body: Record<string, unknown>) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      if (req.method !== 'POST') return badRequest('Method not allowed.');
      let body: Record<string, unknown> = {};
      try {
        body = (await req.json()) as Record<string, unknown>;
      } catch {
        return badRequest('Invalid JSON body.');
      }
      return await fn(req, body);
    } catch (e) {
      if (e instanceof Response) return e;
      console.error(e);
      return json({ error: 'Server error.' }, 500);
    }
  };
}
