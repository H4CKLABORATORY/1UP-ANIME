// 1UP Anime — hide/restore an episode comment (Edge Function).
// Replaces the previous callable moderateEpisodeComment. The comment id is
// the uuid of the row in public.oneup_episode_comments.
import { badRequest, handler, isUuid, json, requireModerator } from '../_shared/auth.ts';

Deno.serve(handler(async (req, body) => {
  const { supa, userId } = await requireModerator(req);
  const commentId = body.commentId;
  const action = body.action;
  if (!isUuid(commentId) || (action !== 'remove' && action !== 'restore')) {
    return badRequest('Invalid operation.');
  }
  const { data, error } = await supa.from('oneup_episode_comments')
    .update({
      status: action === 'remove' ? 'hidden' : 'visible',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .select('id')
    .maybeSingle();
  if (error) throw json({ error: error.message }, 500);
  if (!data) return json({ error: 'Comment not found.' }, 404);
  return json({ ok: true });
}));
