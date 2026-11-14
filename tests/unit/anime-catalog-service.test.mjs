// @ts-check
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DB_PATH = 'C:/Users/Marco/Desktop/script_prueba/jkanime_app/data/jkanime.db';

if (fs.existsSync(DB_PATH)) {
  const db = new DatabaseSync(DB_PATH);
  
  // 1. Verificar conteo de catálogo
  const totalAnimes = db.prepare('SELECT count(*) as c FROM animes').get().c;
  assert.ok(totalAnimes > 4000, 'El catálogo debe contener más de 4,000 animes');

  // 2. Verificar datos de un anime
  const anime = db.prepare('SELECT id, slug, title, image, synopsis FROM animes WHERE slug = ?').get('sousou-no-frieren');
  assert.ok(anime, 'Debe encontrar sousou-no-frieren');
  assert.equal(anime.title, 'Sousou no Frieren');
  assert.ok(anime.image && anime.image.includes('sousou-no-frieren.jpg'), 'Debe tener URL de póster válida');
  assert.ok(anime.synopsis && anime.synopsis.length > 20, 'Debe tener sinopsis en español');

  // 3. Verificar episodios
  const eps = db.prepare('SELECT count(*) as c FROM episodes WHERE anime_id = ?').get(anime.id).c;
  assert.equal(eps, 28, 'Sousou no Frieren debe tener 28 episodios indexados');

  // 4. Verificar enlaces de descarga y reproductores en animes consolidados
  const opAnime = db.prepare('SELECT id FROM animes WHERE slug = ?').get('one-piece');
  assert.ok(opAnime, 'Debe encontrar one-piece');
  const players = db.prepare("SELECT count(*) as c FROM episode_links WHERE anime_id = ? AND kind = 'player'").get(opAnime.id).c;
  const downloads = db.prepare("SELECT count(*) as c FROM episode_links WHERE anime_id = ? AND kind = 'download'").get(opAnime.id).c;
  assert.ok(players > 0, 'One Piece debe tener reproductores indexados');
  assert.ok(downloads > 0, 'One Piece debe tener enlaces de descarga indexados');

  console.log('✔ anime-catalog-service.test.mjs: todas las validaciones de base de datos pasaron con éxito.');
} else {
  console.log('ℹ jkanime.db no localizado en ruta por defecto; omitiendo prueba de integración local.');
}
