// 1UP Anime — hide/restore a global chat message (Edge Function).
// Replaces the previous callable moderateGlobalMessage.
import { badRequest, handler, isUuid, json, requireModerator } from '../_shared/auth.ts';

Deno.serve(handler(async (req, body) => {
  const { supa, userId } = await requireModerator(req);
  const messageId = body.messageId;
  const action = body.action;
  if (!isUuid(messageId) || (action !== 'remove' && action !== 'restore')) {
    return badRequest('Invalid operation.');
  }
  const { data, error } = await supa.from('oneup_global_messages')
    .update({
      status: action === 'remove' ? 'removed' : 'visible',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', messageId)
    .select('id')
    .maybeSingle();
  if (error) throw json({ error: error.message }, 500);
  if (!data) return json({ error: 'Message not found.' }, 404);
  return json({ ok: true });
}));
