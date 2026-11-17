/* 1UP social LOCAL: comentarios de episodios, La Plaza (foro) y chat global
 * funcionando dentro de la propia página (localStorage), sin Firebase ni
 * Google ni ningún servicio externo. Invitados con apodo y cuentas 1UP con
 * su nombre. Reemplaza al adaptador de Firebase conservando su interfaz. */
(() => {
'use strict';
const KEY = 'oneup_social_v1';
const GUEST_KEY = 'oneup_guest_uid';
const newId = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && typeof v === 'object') return v;
  } catch {}
  return { comments: {}, posts: [], replies: {}, chat: [], profiles: {}, follows: {}, likes: {}, friends: {}, reports: [], verifs: [], media: {} };
}
let db = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {}
}
const stamp = ts => ({ toDate: () => new Date(ts), toMillis: () => ts });
function guestUid() {
  try {
    let u = localStorage.getItem(GUEST_KEY);
    if (!u) { u = 'guest-' + newId(); localStorage.setItem(GUEST_KEY, u); }
    return u;
  } catch { return 'guest-local'; }
}
function identity() {
  const a = window.OneUpAuth?.get?.();
  if (a && a.kind === 'local') return { uid: 'cuenta-' + String(a.key || a.name || '1up'), displayName: String(a.name || 'Fan del anime'), account: true };
  return { uid: guestUid(), displayName: '', account: false };
}
function pseudo() { try { return sessionStorage.getItem('oneup_pseudonym') || ''; } catch { return ''; } }
function myName(fallback) {
  const me = identity();
  if (me.account) return me.displayName;
  const p = db.profiles[me.uid];
  return (p && p.displayName) || pseudo() || fallback || 'Invitado';
}
const feedListeners = new Set();
const globalListeners = new Set();
const replyListeners = new Map();
const episodeListeners = new Map();
function on(map, key, cb) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(cb);
  return () => { map.get(key)?.delete(cb); };
}
function emit(map, key, arg) { map.get(key)?.forEach(cb => { try { cb(arg); } catch {} }); }
function commentsOf(key) {
  return (db.comments[key] || []).map(c => ({ id: c.id, displayName: c.name, text: c.text, guest: !!c.guest, owner: false, verified: false, createdAt: stamp(c.ts) }));
}
function feedPosts() {
  return [...db.posts].sort((a, b) => b.ts - a.ts).map(p => ({
    id: p.id, authorUid: p.authorUid, displayName: p.displayName, icon: p.icon || '✦',
    avatarPath: p.avatarPath || '', mediaPath: p.mediaPath || '', kind: p.kind || 'debate',
    text: p.text, likes: (db.likes[p.id] || []).length, owner: false, verified: false, createdAt: stamp(p.ts)
  }));
}
function repliesOf(postId) {
  return (db.replies[postId] || []).map(r => ({ id: r.id, displayName: r.displayName, text: r.text, owner: false, verified: false, createdAt: stamp(r.ts) }));
}
function chatMsgs() {
  return [...db.chat].sort((a, b) => b.ts - a.ts).map(m => ({ id: m.id, displayName: m.displayName, text: m.text, owner: false, verified: false, createdAt: stamp(m.ts) }));
}
function emitFeed() { const posts = feedPosts(); feedListeners.forEach(cb => { try { cb(posts); } catch {} }); }
function emitGlobal() { const msgs = chatMsgs(); globalListeners.forEach(cb => { try { cb(msgs); } catch {} }); }
window.addEventListener('storage', e => {
  if (e.key !== KEY) return;
  db = load();
  emitFeed(); emitGlobal();
  replyListeners.forEach((set, id) => emit(replyListeners, id, repliesOf(id)));
  episodeListeners.forEach((set, k) => emit(episodeListeners, k, commentsOf(k)));
});
async function firebaseAccount() {
  const me = identity();
  return { uid: me.uid, displayName: myName('Invitado'), isAnonymous: !me.account, emailVerified: me.account };
}
function registered(user) { return !!user && !user.isAnonymous; }
async function guestAccess() { return firebaseAccount(); }
async function loginWithGoogle() { return firebaseAccount(); }
async function sdk() {
  return { auth: { signOut: async () => { window.OneUpAuth?.logout?.(); } }, authentication: {} };
}
function episodeThread(animeId, episode) { return String(animeId) + '_ep_' + episode; }
function subscribeEpisode(animeId, episode, cb, err) {
  const key = episodeThread(animeId, episode);
  const off = on(episodeListeners, key, cb);
  try { cb(commentsOf(key)); } catch (e) { err?.(maskError(e)); }
  return Promise.resolve(off);
}
async function sendEpisodeComment(animeId, episode, name, body) {
  const text = String(body || '').trim();
  if (text.length < 2) throw new Error('Escribe un comentario válido.');
  const me = identity();
  const displayName = me.account ? me.displayName : (String(name || '').trim() || myName('Invitado'));
  const key = episodeThread(animeId, episode);
  (db.comments[key] = db.comments[key] || []).push({ id: newId(), name: displayName, text, guest: !me.account, ts: Date.now() });
  save();
  emit(episodeListeners, key, commentsOf(key));
}
function subscribeFeed(cb, err) {
  feedListeners.add(cb);
  try { cb(feedPosts()); } catch (e) { err?.(maskError(e)); }
  return Promise.resolve(() => feedListeners.delete(cb));
}
async function publishPost({ text, kind, mediaPath }) {
  const body = String(text || '').trim();
  if (body.length < 2) throw new Error('Escribe algo para publicar.');
  const me = identity();
  const prof = db.profiles[me.uid] || {};
  db.posts.push({
    id: newId(), authorUid: me.uid, displayName: myName('Invitado'),
    icon: prof.icon || '✦', avatarPath: prof.avatarPath || '',
    kind: kind || 'debate', text: body, mediaPath: mediaPath || '', ts: Date.now()
  });
  save();
  emitFeed();
}
function subscribeReplies(postId, cb, err) {
  const off = on(replyListeners, postId, cb);
  try { cb(repliesOf(postId)); } catch (e) { err?.(maskError(e)); }
  return Promise.resolve(off);
}
async function replyToPost(postId, text) {
  const body = String(text || '').trim();
  if (body.length < 2) throw new Error('Escribe una respuesta válida.');
  (db.replies[postId] = db.replies[postId] || []).push({ id: newId(), displayName: myName('Invitado'), text: body, ts: Date.now() });
  save();
  emit(replyListeners, postId, repliesOf(postId));
}
async function react(postId) {
  const me = identity();
  const list = db.likes[postId] = db.likes[postId] || [];
  const i = list.indexOf(me.uid);
  if (i >= 0) list.splice(i, 1); else list.push(me.uid);
  save();
  emitFeed();
}
function subscribeGlobal(cb, err) {
  globalListeners.add(cb);
  try { cb(chatMsgs()); } catch (e) { err?.(maskError(e)); }
  return Promise.resolve(() => globalListeners.delete(cb));
}
async function sendGlobal(text) {
  const body = String(text || '').trim();
  if (!body) throw new Error('Escribe un mensaje.');
  db.chat.push({ id: newId(), displayName: myName('Invitado'), text: body, ts: Date.now() });
  if (db.chat.length > 200) db.chat = db.chat.slice(-200);
  save();
  emitGlobal();
}
async function myProfile() {
  const me = identity();
  return db.profiles[me.uid] || null;
}
async function updateProfile({ displayName, icon, avatarPath }) {
  const me = identity();
  db.profiles[me.uid] = { displayName: String(displayName || '').trim() || myName('Invitado'), icon: icon || '⚔️', avatarPath: avatarPath || '' };
  save();
}
async function follow(uid) {
  const me = identity();
  if (!uid || uid === me.uid) return { following: false };
  const list = db.follows[me.uid] = db.follows[me.uid] || [];
  const i = list.indexOf(uid);
  let following;
  if (i >= 0) { list.splice(i, 1); following = false; } else { list.push(uid); following = true; }
  save();
  return { following };
}
async function requestFriend(uid) {
  const me = identity();
  if (!uid || uid === me.uid) return;
  const rec = db.friends[me.uid] = db.friends[me.uid] || { outgoing: [] };
  if (!rec.outgoing.includes(uid)) rec.outgoing.push(uid);
  save();
}
function nameOf(uid) {
  if (db.profiles[uid]?.displayName) return db.profiles[uid].displayName;
  const post = db.posts.find(p => p.authorUid === uid);
  return post ? post.displayName : 'Fan del anime';
}
async function listFriends() {
  const me = identity();
  const friends = (db.follows[me.uid] || []).map(uid => ({ uid, fromUid: uid, displayName: nameOf(uid) }));
  return { incoming: [], friends };
}
async function answerFriend() { return; }
function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    r.readAsDataURL(file);
  });
}
async function storeFile(file, prefix) {
  if (!file) throw new Error('Falta el archivo.');
  if (file.size > 1800000) throw new Error('El archivo es muy grande para guardarlo en esta página (máximo ~1.8 MB).');
  const data = await readFile(file);
  const key = prefix + newId();
  db.media[key] = data;
  save();
  if (!db.media[key]) throw new Error('No cupo el archivo en este dispositivo.');
  return 'local:' + key;
}
async function uploadCommunityFile(file) { return storeFile(file, 'm-'); }
async function uploadAvatar(file) { return storeFile(file, 'avatar-'); }
async function mediaURL(path) {
  const p = String(path || '');
  if (p.startsWith('local:')) {
    const data = db.media[p.slice(6)];
    if (!data) throw new Error('Archivo no disponible.');
    return data;
  }
  return p;
}
async function verificationRequest(reason) {
  const me = identity();
  db.verifs.push({ uid: me.uid, reason: String(reason || ''), ts: Date.now() });
  save();
}
async function report(kind, ref, reason) {
  db.reports.push({ kind, ref: String(ref || ''), reason: String(reason || ''), ts: Date.now() });
  save();
}
async function callable() { throw new Error('Esta acción no está disponible en la comunidad local.'); }
function maskError(e) { return e?.message?.slice(0, 180) || 'No se pudo completar la acción.'; }
window.OneUpSocialBackend = {
  sdk, firebaseAccount, guestAccess, registered, loginWithGoogle, episodeThread,
  subscribeEpisode, sendEpisodeComment, subscribeFeed, publishPost, replyToPost, subscribeReplies, react, report,
  subscribeGlobal, sendGlobal, updateProfile, verificationRequest, follow, requestFriend, listFriends, answerFriend, myProfile, uploadAvatar,
  uploadCommunityFile, mediaURL, callable, maskError,
  enabled: () => true,
  explain: 'Comunidad 1UP activa dentro de esta página: comentarios, publicaciones y chat se guardan en este dispositivo, sin servicios externos.'
};
})();
