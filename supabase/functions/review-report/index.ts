// 1UP Anime — resolve/dismiss a moderation report (Edge Function).
// Replaces the previous callable reviewReport.
import { badRequest, handler, isUuid, json, requireModerator } from '../_shared/auth.ts';

Deno.serve(handler(async (req, body) => {
  const { supa, userId } = await requireModerator(req);
  const reportId = body.reportId;
  const decision = body.decision;
  if (!isUuid(reportId) || (decision !== 'resolved' && decision !== 'dismissed')) {
    return badRequest('Invalid report or resolution.');
  }
  const { data, error } = await supa.from('oneup_moderation_reports')
    .update({
      status: decision,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();
  if (error) throw json({ error: error.message }, 500);
  if (!data) return json({ error: 'Report not available.' }, 404);
  return json({ ok: true });
}));
