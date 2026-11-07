/* 1UP Anime — Phase 6: owner/moderator admin for licensed episode entries.
 * The page itself grants nothing: the role is read from the database
 * (oneup_my_admin_role) and every write goes to Postgres under RLS, where
 * oneup_admin_roles decides, and the Rule-12 CHECK decides whether an
 * entry may be active. Guests and non-admin accounts only ever see the
 * not-authorized view — never setup instructions.
 */
(() => {
'use strict';
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const media = () => window.OneUpLicensedMedia;
const social = () => window.OneUpSocialBackend;
const status = (s) => { $('#admin-status').textContent = s; };
const formStatus = (s) => { $('#lm-form-status').textContent = s; };
const RIGHTS_LABELS = { owned: 'Propio', authorized: 'Autorizado', pending: 'Pendiente', rejected: 'Rechazado' };

function validateLicensed(v) {
  if (!/^(mal|al)-[1-9][0-9]*$/.test(v.anime_id || ''))
    return 'El ID del anime debe tener el formato del catálogo (p. ej. mal-27947).';
  if (!Number.isInteger(v.season) || v.season < 1 || v.season > 99)
    return 'La temporada debe ser un número entre 1 y 99.';
  if (!Number.isInteger(v.episode_number) || v.episode_number < 1 || v.episode_number > 9999)
    return 'El episodio debe ser un número entre 1 y 9999.';
  if (!String(v.provider || '').trim()) return 'Escribe el proveedor o nombre de la fuente.';
  if (v.mode === 'official_embed') {
    if (!/^[A-Za-z0-9_-]{11}$/.test(v.video_id || ''))
      return 'El ID de YouTube debe tener exactamente 11 caracteres válidos.';
  } else if (v.mode === 'file') {
    const url = String(v.source_url || '');
    if (!/^https:\/\//i.test(url) || !/\.(mp4|webm|m3u8)([?].*)?$/i.test(url))
      return 'La URL del archivo debe empezar por https:// y terminar en .mp4, .webm o .m3u8.';
  } else return 'Modo de reproducción no admitido.';
  const subs = String(v.subtitles_url || '').trim();
  if (subs && !(/^https:\/\/[^ ]+\.vtt([?].*)?$/i.test(subs) || /^\.\/media\/[A-Za-z0-9_./-]+\.vtt$/.test(subs)))
    return 'Los subtítulos deben ser una URL https terminada en .vtt.';
  if (!['owned', 'authorized', 'pending', 'rejected'].includes(v.rights_status))
    return 'Estado de derechos no admitido.';
  // Rule 12 mirrors the database CHECK so the owner gets the message here
  // first; the database still has the final word on direct API writes.
  if (v.active && !['owned', 'authorized'].includes(v.rights_status))
    return 'Regla 12: solo se puede activar una entrada con derechos propios o autorizados.';
  if (v.active && !String(v.rights_note || '').trim())
    return 'Regla 12: para activar la entrada debes documentar los derechos en la nota.';
  return null;
}
function readForm() {
  const mode = $('#lm-mode').value;
  return {
    anime_id: $('#lm-anime-id').value.trim(),
    season: Number($('#lm-season').value),
    episode_number: Number($('#lm-episode-number').value),
    episode_title: $('#lm-episode-title').value.trim(),
    provider: $('#lm-provider').value.trim(),
    mode,
    video_id: mode === 'official_embed' ? $('#lm-video-id').value.trim() : null,
    source_url: mode === 'file' ? $('#lm-source-url').value.trim() : null,
    language: $('#lm-language').value.trim() || 'es-419',
    quality: $('#lm-quality').value.trim(),
    subtitles_url: $('#lm-subtitles-url').value.trim() || null,
    rights_status: $('#lm-rights-status').value,
    rights_note: $('#lm-rights-note').value.trim(),
    active: $('#lm-active').checked,
  };
}
function fillForm(row) {
  $('#lm-editing-id').value = row.id;
  $('#lm-anime-id').value = row.anime_id;
  $('#lm-season').value = row.season;
  $('#lm-episode-number').value = row.episode_number;
  $('#lm-episode-title').value = row.episode_title || '';
  $('#lm-provider').value = row.provider;
  $('#lm-mode').value = row.mode;
  $('#lm-video-id').value = row.video_id || '';
  $('#lm-source-url').value = row.source_url || '';
  $('#lm-language').value = row.language || 'es-419';
  $('#lm-quality').value = row.quality || '';
  $('#lm-subtitles-url').value = row.subtitles_url || '';
  $('#lm-rights-status').value = row.rights_status;
  $('#lm-rights-note').value = row.rights_note || '';
  $('#lm-active').checked = Boolean(row.active);
  syncMode();
  $('#lm-form-title').textContent = 'EDITAR ENTRADA';
  $('#lm-submit').textContent = 'Guardar cambios';
  $('#lm-cancel').hidden = false;
  $('#lm-form').scrollIntoView({ block: 'start' });
}
function resetForm() {
  $('#lm-form').reset();
  $('#lm-editing-id').value = '';
  $('#lm-season').value = '1';
  $('#lm-episode-number').value = '1';
  $('#lm-language').value = 'es-419';
  $('#lm-form-title').textContent = 'NUEVA ENTRADA';
  $('#lm-submit').textContent = 'Guardar entrada';
  $('#lm-cancel').hidden = true;
  syncMode();
  formStatus('');
}
function syncMode() {
  const embed = $('#lm-mode').value === 'official_embed';
  $('#lm-video-wrap').hidden = !embed;
  $('#lm-source-wrap').hidden = embed;
}
function entryCard(row) {
  const source = row.mode === 'official_embed'
    ? 'YouTube ' + esc(row.video_id || '')
    : esc(row.source_url || '');
  return '<article class="mod-card"><div class="mod-details"><strong>' +
    esc(row.anime_id) + ' · T' + esc(row.season) + ' E' + esc(row.episode_number) + ' · ' +
    esc(row.episode_title || 'Sin título') + '</strong><span>' +
    esc(row.provider) + ' · ' + (row.mode === 'official_embed' ? 'Inserción oficial' : 'Archivo') +
    ' · ' + esc(row.language) + (row.quality ? ' · ' + esc(row.quality) : '') + '</span><p>' +
    source + '</p><small>Derechos: ' + esc(RIGHTS_LABELS[row.rights_status] || row.rights_status) +
    ' — ' + esc(row.rights_note || 'sin nota') + '<br>Estado: ' +
    (row.active ? 'ACTIVA (visible en la ficha)' : 'inactiva') + '</small></div>' +
    '<div class="mod-actions">' +
    '<button type="button" class="c-primary" data-lm-toggle="' + esc(row.id) + '" data-lm-active="' + String(!row.active) + '">' + (row.active ? 'Desactivar' : 'Activar') + '</button>' +
    '<button type="button" class="c-outline" data-lm-edit="' + esc(row.id) + '">Editar</button>' +
    '<button type="button" class="c-outline" data-lm-delete="' + esc(row.id) + '">Eliminar</button>' +
    '</div></article>';
}
let entries = [];
async function refreshLists() {
  entries = await media().listAllForAdmin();
  $('#lm-list').innerHTML = entries.length
    ? entries.map(entryCard).join('')
    : '<p class="c-empty">Todavía no hay entradas gestionadas. Crea la primera con el formulario.</p>';
  try {
    const res = await fetch('./data/licensed-media.json', { cache: 'no-cache' });
    const json = await res.json();
    const rows = [];
    for (const [animeId, entry] of Object.entries(json?.entries || {})) {
      for (const ep of entry.episodes || []) {
        rows.push('<article class="mod-card"><div class="mod-details"><strong>' +
          esc(animeId) + ' · E' + esc(ep.number) + ' · ' + esc(ep.title || 'Episodio') +
          '</strong><span>estático · ' + esc(entry.provider || '') + '</span><p>' +
          esc((ep.sources || []).map((s) => s.name || s.provider || s.mode).join(' · ')) +
          '</p><small>Entrada del manifiesto estático: solo lectura.</small></div></article>');
      }
    }
    $('#lm-static-list').innerHTML = rows.length ? rows.join('') : '<p class="c-empty">El manifiesto estático no tiene entradas.</p>';
  } catch {
    $('#lm-static-list').innerHTML = '<p class="c-empty">No se pudo leer el manifiesto estático.</p>';
  }
}
async function refresh() {
  if (!media()?.enabled()) {
    status('Este panel aún no está disponible.');
    $('#admin-dashboard').hidden = true;
    $('#admin-login-form').hidden = true;
    return;
  }
  let user = null;
  try { user = await social().supabaseAccount(); } catch { user = null; }
  if (!social().registered(user)) {
    $('#admin-dashboard').hidden = true;
    $('#admin-login-form').hidden = false;
    status('Acceso restringido: inicia sesión con tu cuenta 1UP para comprobar tu acceso.');
    return;
  }
  $('#admin-login-form').hidden = true;
  const role = await media().myAdminRole();
  if (!role) {
    $('#admin-dashboard').hidden = true;
    status('Acceso denegado: esta sección es solo para el propietario y los moderadores de 1UP.');
    return;
  }
  status(role === 'owner' ? 'Acceso confirmado: propietario 1UP' : 'Acceso confirmado: moderador 1UP');
  $('#admin-dashboard').hidden = false;
  try { await refreshLists(); }
  catch (e) { formStatus(media().maskError(e)); }
}
async function onSubmit(e) {
  e.preventDefault();
  const values = readForm();
  const problem = validateLicensed(values);
  if (problem) { formStatus(problem); return; }
  const button = $('#lm-submit');
  button.disabled = true;
  try {
    const editingId = $('#lm-editing-id').value;
    if (editingId) await media().updateEntry(editingId, values);
    else await media().createEntry(values);
    const done = editingId ? 'Entrada actualizada.' : 'Entrada creada. Si está activa, ya aparece en la ficha del anime.';
    resetForm();
    formStatus(done);
    await refreshLists();
  } catch (err) { formStatus(media().maskError(err)); }
  finally { button.disabled = false; }
}
async function onListClick(e) {
  const toggle = e.target.closest('[data-lm-toggle]');
  const edit = e.target.closest('[data-lm-edit]');
  const del = e.target.closest('[data-lm-delete]');
  if (!(toggle || edit || del)) return;
  const button = toggle || edit || del;
  const row = entries.find((x) => x.id === button.dataset.lmToggle || x.id === button.dataset.lmEdit || x.id === button.dataset.lmDelete);
  if (!row) return;
  if (edit) { fillForm(row); return; }
  button.disabled = true;
  try {
    if (del) {
      if (!confirm('¿Eliminar esta entrada de episodios con licencia?')) return;
      await media().deleteEntry(row.id);
      if ($('#lm-editing-id').value === row.id) resetForm();
    } else if (toggle) {
      const next = button.dataset.lmActive === 'true';
      const problem = validateLicensed({ ...row, active: next });
      if (problem) { formStatus(problem); return; }
      await media().updateEntry(row.id, { active: next });
    }
    await refreshLists();
  } catch (err) { formStatus(media().maskError(err)); }
  finally { button.disabled = false; }
}
async function onLogin(e) {
  e.preventDefault();
  const button = e.target.querySelector('button[type=submit]');
  button.disabled = true;
  status('Comprobando tu sesión…');
  try {
    await social().loginWithEmail($('#admin-email').value, $('#admin-password').value);
    await refresh();
  } catch (err) { status(social().maskError(err)); }
  finally { button.disabled = false; }
}
document.addEventListener('DOMContentLoaded', () => {
  $('#lm-form').addEventListener('submit', onSubmit);
  $('#lm-mode').addEventListener('change', syncMode);
  $('#lm-cancel').addEventListener('click', resetForm);
  $('#lm-list').addEventListener('click', onListClick);
  $('#admin-refresh').addEventListener('click', () => refresh().catch(() => {}));
  $('#admin-login-form').addEventListener('submit', onLogin);
  syncMode();
  refresh();
});
window.OneUpLicensedAdmin = { validateLicensed };
})();
