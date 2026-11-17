/* 1UP ANIME — comunidad en Supabase (REST, sin SDK).
 * Reemplaza el backend local cuando window.ONEUP_SOCIAL_SUPABASE existe:
 * comentarios, publicaciones, respuestas, chat, perfiles y seguidos se
 * comparten entre TODOS los visitantes. Identidad: cuentas nativas 1UP
 * (auth.js) o invitado con apodo. Sin Google, sin Firebase. */
(function (global) {
  'use strict';
  const cfg = global.ONEUP_SOCIAL_SUPABASE;
  if (!cfg || !cfg.url || !cfg.key) return;
  const BASE = String(cfg.url).replace(/\/+$/, '');
  const KEY = String(cfg.key);
  const H = () => ({ apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' });

  async function rest(path, opts = {}) {
    const r = await fetch(BASE + '/rest/v1/' + path, { ...opts, headers: { ...H(), ...(opts.headers || {}) } });
    if (!r.ok) {
      let detail = '';
      try { detail = (await r.json())?.message || ''; } catch { /* sin detalle */ }
      throw Error(detail || ('HTTP ' + r.status));
    }
    if (r.status === 204) return null;
    const text = await r.text();
    return text ? JSON.parse(text) : null;
  }
  const enc = encodeURIComponent;

  /* ---------- identidad (misma que el backend local) ---------- */
  function guestUid() {
    let u = localStorage.getItem('oneup_guest_uid');
    if (!u) {
      u = 'inv-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      localStorage.setItem('oneup_guest_uid', u);
    }
    return u;
  }
  function identity() {
    const a = global.OneUpAuth?.get?.();
    if (a && a.kind === 'local') return { uid: 'cuenta-' + a.key, name: a.name || 'Usuario 1UP', guest: false };
    return { uid: guestUid(), name: a?.name || 'Invitado', guest: true };
  }
  const ts = iso => ({ toDate: () => new Date(iso), toMillis: () => Date.parse(iso) || 0 });

  /* ---------- sondeo (sustituye al tiempo real sin SDK) ---------- */
  const pollers = new Set();
  function poll(run, ms) {
    run();
    const t = setInterval(run, ms);
    const entry = { run, t };
    pollers.add(entry);
    return () => { clearInterval(t); pollers.delete(entry); };
  }
  function poke() { for (const p of [...pollers]) { try { p.run(); } catch { /* sigue */ } } }

  /* ---------- mapeos ---------- */
  const mapPost = r => ({
    id: r.id, authorUid: r.author_uid, displayName: r.display_name, kind: r.kind,
    text: r.text, mediaPath: r.media_url || '', likes: r.likes || 0,
    icon: '', avatarPath: '', owner: false, verified: false, createdAt: ts(r.created_at)
  });
  const mapComment = r => ({
    id: r.id, displayName: r.display_name, text: r.text, guest: !!r.guest,
    owner: false, verified: false, createdAt: ts(r.created_at)
  });
  const mapReply = r => ({
    id: r.id, displayName: r.display_name, text: r.text, owner: false, verified: false, createdAt: ts(r.created_at)
  });
  const mapChat = r => ({ id: r.id, displayName: r.display_name, text: r.text, createdAt: ts(r.created_at) });

  async function profileName(uid, fallback) {
    try {
      const rows = await rest('social_profiles?uid=eq.' + enc(uid) + '&select=display_name');
      return rows?.[0]?.display_name || fallback || 'Usuario 1UP';
    } catch { return fallback || 'Usuario 1UP'; }
  }

  /* ---------- almacenamiento de archivos ---------- */
  async function upload(file, path) {
    if (file.size > 1.8 * 1024 * 1024) throw Error('El archivo supera el tamaño permitido para la demostración local.');
    const r = await fetch(BASE + '/storage/v1/object/community/' + path, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' },
      body: file
    });
    if (!r.ok) throw Error('No se pudo subir el archivo.');
    return BASE + '/storage/v1/object/public/community/' + path;
  }
  const safeName = n => String(n || 'archivo').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-60);

  const api = {
    explain: 'Comunidad 1UP en Supabase: pública y compartida entre todos los visitantes.',
    enabled: () => true,
    sdk: async () => ({ auth: { signOut: async () => global.OneUpAuth?.logout?.() }, authentication: {} }),
    firebaseAccount: async () => { const me = identity(); return { uid: me.uid, displayName: me.name, isAnonymous: me.guest }; },
    guestAccess: async () => { const me = identity(); return { uid: me.uid, displayName: me.name }; },
    registered: async () => !identity().guest,
    loginWithGoogle: async () => { const me = identity(); return { uid: me.uid, displayName: me.name }; },

    episodeThread: (animeId, episode) => String(animeId) + '_ep_' + Number(episode),
    subscribeEpisode(animeId, episode, cb, err) {
      const thread = api.episodeThread(animeId, episode);
      let ok = false;
      return Promise.resolve(poll(async () => {
        try {
          const rows = await rest('social_comments?thread=eq.' + enc(thread) + '&select=*&order=created_at.asc&limit=300');
          ok = true;
          cb((rows || []).map(mapComment));
        } catch (e) { if (!ok && err) err(api.maskError(e)); }
      }, 6000));
    },
    async sendEpisodeComment(animeId, episode, name, body) {
      const thread = api.episodeThread(animeId, episode);
      const me = identity();
      const displayName = me.guest ? String(name || '').trim().slice(0, 40) : me.name;
      if (!displayName) throw Error('Escribe tu nombre temporal para comentar como invitado.');
      await rest('social_comments', {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ thread, author_uid: me.uid, display_name: displayName, guest: me.guest, text: String(body || '').trim().slice(0, 1000) })
      });
      poke();
    },

    subscribeFeed(cb) {
      return Promise.resolve(poll(async () => {
        try {
          const rows = await rest('social_posts?select=*&order=created_at.desc&limit=200');
          cb((rows || []).map(mapPost));
        } catch { /* siguiente ciclo */ }
      }, 6000));
    },
    async publishPost(draft) {
      const me = identity();
      await rest('social_posts', {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          author_uid: me.uid, display_name: me.name, kind: String(draft.kind || 'publicacion'),
          text: String(draft.text || '').trim().slice(0, 2000), media_url: draft.mediaPath || null
        })
      });
      poke();
    },
    subscribeReplies(postId, cb) {
      return Promise.resolve(poll(async () => {
        try {
          const rows = await rest('social_replies?post_id=eq.' + enc(postId) + '&select=*&order=created_at.asc&limit=300');
          cb((rows || []).map(mapReply));
        } catch { /* siguiente ciclo */ }
      }, 6000));
    },
    async replyToPost(postId, body) {
      const me = identity();
      await rest('social_replies', {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ post_id: postId, author_uid: me.uid, display_name: me.name, text: String(body || '').trim().slice(0, 1000) })
      });
      poke();
    },
    async react(postId) {
      const me = identity();
      const mine = await rest('social_likes?post_id=eq.' + enc(postId) + '&uid=eq.' + enc(me.uid) + '&select=post_id');
      if (mine && mine.length) {
        await rest('social_likes?post_id=eq.' + enc(postId) + '&uid=eq.' + enc(me.uid), { method: 'DELETE' });
      } else {
        await rest('social_likes', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ post_id: postId, uid: me.uid }) });
      }
      const all = await rest('social_likes?post_id=eq.' + enc(postId) + '&select=post_id');
      const count = (all || []).length;
      await rest('social_posts?id=eq.' + enc(postId), { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ likes: count }) });
      poke();
      return count;
    },
    async report(kind, target, reason) {
      const me = identity();
      await rest('social_reports', {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ kind: String(kind), target: String(target), reason: String(reason || ''), author_uid: me.uid })
      });
    },

    subscribeGlobal(cb) {
      return Promise.resolve(poll(async () => {
        try {
          const rows = await rest('social_chat?select=*&order=created_at.desc&limit=200');
          cb((rows || []).map(mapChat));
        } catch { /* siguiente ciclo */ }
      }, 4000));
    },
    async sendGlobal(body) {
      const me = identity();
      await rest('social_chat', {
        method: 'POST', headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ author_uid: me.uid, display_name: me.name, text: String(body || '').trim().slice(0, 500) })
      });
      poke();
    },

    async updateProfile(data) {
      const me = identity();
      await rest('social_profiles?on_conflict=uid', {
        method: 'POST', headers: { Prefer: 'resolution=merge-duplicate,return=minimal' },
        body: JSON.stringify({ uid: me.uid, display_name: String(data.displayName || me.name).slice(0, 40), bio: String(data.bio || '').slice(0, 240), icon: String(data.icon || ''), avatar_url: data.avatarPath || null, updated_at: new Date().toISOString() })
      });
      poke();
    },
    async myProfile() {
      const me = identity();
      const rows = await rest('social_profiles?uid=eq.' + enc(me.uid) + '&select=*');
      const r = rows?.[0];
      if (!r) return null;
      return { displayName: r.display_name || '', bio: r.bio || '', icon: r.icon || '', avatarPath: r.avatar_url || '' };
    },
    async verificationRequest() {
      await api.report('verificacion', identity().uid, 'Solicitud de insignia de creador');
    },
    async follow(uid) {
      const me = identity();
      if (!uid || uid === me.uid) return { following: false };
      const mine = await rest('social_follows?follower_uid=eq.' + enc(me.uid) + '&target_uid=eq.' + enc(uid) + '&select=target_uid');
      if (mine && mine.length) {
        await rest('social_follows?follower_uid=eq.' + enc(me.uid) + '&target_uid=eq.' + enc(uid), { method: 'DELETE' });
        return { following: false };
      }
      await rest('social_follows', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ follower_uid: me.uid, target_uid: uid }) });
      return { following: true };
    },
    async requestFriend(uid) {
      const me = identity();
      if (!uid || uid === me.uid) return;
      await rest('social_follows?on_conflict=follower_uid,target_uid', {
        method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify({ follower_uid: me.uid, target_uid: uid })
      });
    },
    async listFriends() {
      const me = identity();
      const out = await rest('social_follows?follower_uid=eq.' + enc(me.uid) + '&select=target_uid');
      const inc = await rest('social_follows?target_uid=eq.' + enc(me.uid) + '&select=follower_uid');
      const friends = [];
      for (const f of out || []) friends.push({ displayName: await profileName(f.target_uid) });
      const incoming = [];
      for (const f of inc || []) incoming.push({ fromUid: f.follower_uid, displayName: await profileName(f.follower_uid) });
      return { incoming, friends };
    },
    async answerFriend() { /* la amistad se expresa siguiendo; sin paso extra */ },

    async uploadAvatar(file) {
      const me = identity();
      return upload(file, 'avatars/' + me.uid + '-' + Date.now() + '-' + safeName(file.name));
    },
    async uploadCommunityFile(file, draftId) {
      return upload(file, 'posts/' + String(draftId || 'borrador') + '-' + Date.now() + '-' + safeName(file.name));
    },
    mediaURL: async p => p || '',
    callable: async () => { throw Error('Acción no disponible en la comunidad web.'); },
    maskError(error) {
      const v = String(error?.message || error || '').toLowerCase();
      if (v.includes('failed to fetch') || v.includes('network')) return 'Sin conexión con la comunidad. Revisa tu internet e inténtalo de nuevo.';
      if (v.includes('duplicate') || v.includes('23505')) return 'Eso ya estaba registrado.';
      if (v.includes('permission') || v.includes('row-level') || v.includes('42501')) return 'No tienes permiso para realizar esa acción.';
      return 'No se pudo completar la operación. Inténtalo de nuevo.';
    }
  };

  global.OneUpSocialBackend = api;
})(window);
