// 1UP Anime — moderation dashboard (Edge Function).
// Replaces the previous callable moderationDashboard. Requires an
// owner/moderator row in public.oneup_admin_roles.
import { handler, json, requireModerator } from '../_shared/auth.ts';

Deno.serve(handler(async (req) => {
  const { supa, role } = await requireModerator(req);
  const [posts, reports, verify] = await Promise.all([
    supa.from('oneup_community_posts')
      .select('id,display_name,kind,text,media_path')
      .eq('status', 'pending').order('created_at', { ascending: true }).limit(40),
    supa.from('oneup_moderation_reports')
      .select('id,type,target,reason')
      .eq('status', 'pending').order('created_at', { ascending: true }).limit(40),
    role === 'owner'
      ? supa.from('oneup_verification_requests')
        .select('user_id,reason')
        .eq('status', 'pending').order('requested_at', { ascending: true }).limit(40)
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (posts.error) throw json({ error: posts.error.message }, 500);
  if (reports.error) throw json({ error: reports.error.message }, 500);
  return json({
    role,
    posts: (posts.data ?? []).map((d) => ({
      id: d.id, displayName: d.display_name, kind: d.kind,
      text: d.text ?? '', mediaPath: d.media_path ?? '',
    })),
    reports: (reports.data ?? []).map((d) => ({
      id: d.id, type: d.type, target: d.target, reason: d.reason ?? '',
    })),
    verification: role === 'owner'
      ? (verify.data ?? []).map((d) => ({ uid: d.user_id, reason: d.reason ?? '' }))
      : [],
  });
}));
