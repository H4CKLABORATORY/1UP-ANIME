// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pipeline } from 'node:stream/promises';

const DB_PATH = path.resolve('data/jkanime.db');
const GZ_PATH = path.resolve('data/jkanime.db.gz');

/**
 * Ensures data/jkanime.db exists and is ready for use.
 * If data/jkanime.db is missing, decompresses data/jkanime.db.gz.
 * @param {object} [options]
 * @param {boolean} [options.silent=false]
 * @returns {Promise<boolean>} true if database is ready
 */
export async function ensureDatabase({ silent = false } = {}) {
  // 1. Check if already extracted and valid (> 1MB)
  if (fs.existsSync(DB_PATH)) {
    try {
      const stat = fs.statSync(DB_PATH);
      if (stat.size > 1024 * 1024) {
        if (!silent) console.log(`[Database] Base de datos local lista: ${DB_PATH} (${(stat.size / (1024 * 1024)).toFixed(1)} MB)`);
        return true;
      }
    } catch {}
  }

  // 2. Check if compressed archive exists
  if (!fs.existsSync(GZ_PATH)) {
    if (!silent) console.warn('[Database] Advertencia: No se encontró data/jkanime.db ni data/jkanime.db.gz.');
    return false;
  }

  const tmpPath = `${DB_PATH}.tmp-${Date.now()}`;
  if (!silent) console.log('[Database] Inicializando base de datos local desde data/jkanime.db.gz...');
  const t0 = Date.now();

  try {
    const read = fs.createReadStream(GZ_PATH);
    const gunzip = zlib.createGunzip();
    const write = fs.createWriteStream(tmpPath);

    await pipeline(read, gunzip, write);

    // Atomic rename
    fs.renameSync(tmpPath, DB_PATH);
    const stat = fs.statSync(DB_PATH);
    const elapsed = Date.now() - t0;
    if (!silent) {
      console.log(`[Database] ¡Éxito! Base de datos SQLite descomprimida en ${elapsed} ms: ${(stat.size / (1024 * 1024)).toFixed(1)} MB.`);
    }
    return true;
  } catch (err) {
    if (fs.existsSync(tmpPath)) {
      try { fs.unlinkSync(tmpPath); } catch {}
    }
    if (!silent) console.error('[Database] Error al descomprimir base de datos:', err);
    return false;
  }
}

// Direct execution
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/setup-db.mjs');
if (isMain) {
  ensureDatabase().then((ok) => {
    process.exit(ok ? 0 : 1);
  });
}
