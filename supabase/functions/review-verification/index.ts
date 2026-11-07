// 1UP Anime — approve/reject a verification request (Edge Function).
// Replaces the previous callable reviewVerification. Owner only.
import { badRequest, handler, isUuid, json, requireModerator } from '../_shared/auth.ts';

Deno.serve(handler(async (req, body) => {
  const { supa, userId } = await requireModerator(req, true);
  const target = body.targetUid;
  const decision = body.decision;
  if (!isUuid(target) || (decision !== 'approve' && decision !== 'reject')) {
    return badRequest('Invalid request.');
  }
  const { data: pending, error: readError } = await supa
    .from('oneup_verification_requests')
    .select('user_id')
    .eq('user_id', target)
    .eq('status', 'pending')
    .maybeSingle();
  if (readError) throw json({ error: readError.message }, 500);
  if (!pending) return json({ error: 'No pending request.' }, 412);
  const approved = decision === 'approve';
  const { error } = await supa.from('oneup_verification_requests')
    .update({
      status: approved ? 'approved' : 'rejected',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('user_id', target)
    .eq('status', 'pending');
  if (error) throw json({ error: error.message }, 500);
  if (approved) {
    const { data: profile } = await supa.from('profiles')
      .select('username').eq('id', target).maybeSingle();
    const { error: upsertError } = await supa.from('oneup_creator_profiles')
      .upsert({
        user_id: target,
        display_name: (profile as { username?: string } | null)?.username ?? 'Fan del anime',
        verified: true,
      }, { onConflict: 'user_id' });
    if (upsertError) throw json({ error: upsertError.message }, 500);
  }
  return json({ ok: true, verified: approved });
}));
