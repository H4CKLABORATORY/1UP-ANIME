// 1UP Anime — approve/remove a community post (Edge Function).
// Replaces the previous callable moderateCommunityPost.
import { badRequest, handler, isUuid, json, requireModerator } from '../_shared/auth.ts';

Deno.serve(handler(async (req, body) => {
  const { supa, userId } = await requireModerator(req);
  const postId = body.postId;
  const action = body.action;
  if (!isUuid(postId) || (action !== 'approve' && action !== 'remove')) {
    return badRequest('Invalid moderation operation.');
  }
  const { data, error } = await supa.from('oneup_community_posts')
    .update({
      status: action === 'approve' ? 'visible' : 'removed',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .select('id')
    .maybeSingle();
  if (error) throw json({ error: error.message }, 500);
  if (!data) return json({ error: 'Post not found.' }, 404);
  return json({ ok: true });
}));
