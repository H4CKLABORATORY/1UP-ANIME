// 1UP Anime — hide/restore a reply to a community post (Edge Function).
// Replaces the previous callable moderateCommunityReply.
import { badRequest, handler, isUuid, json, requireModerator } from '../_shared/auth.ts';

Deno.serve(handler(async (req, body) => {
  const { supa, userId } = await requireModerator(req);
  const postId = body.postId;
  const commentId = body.commentId;
  const action = body.action;
  if (!isUuid(postId) || !isUuid(commentId) || (action !== 'remove' && action !== 'restore')) {
    return badRequest('Invalid operation.');
  }
  const { data, error } = await supa.from('oneup_community_comments')
    .update({
      status: action === 'remove' ? 'removed' : 'visible',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .eq('post_id', postId)
    .select('id')
    .maybeSingle();
  if (error) throw json({ error: error.message }, 500);
  if (!data) return json({ error: 'Reply not found.' }, 404);
  return json({ ok: true });
}));
