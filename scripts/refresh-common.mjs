/* 1UP Anime — shared robustness helpers for the AniList refresh scripts
 * (Phase 3, audit §8.4 gaps 6 and 7). Metadata only.
 *
 * - Concurrency lock: a lockfile with stale expiry so a manual run and a
 *   GitHub Actions run of a refresh script can never overlap and double
 *   the AniList request rate. A second run exits cleanly (code 0) with a
 *   clear log line; it is a skip, not a failure.
 * - Outage classification: AniList HTTP 403 and 5xx are retriable outages
 *   (backoff, then the caller's snapshot fallback), not hard errors.
 * - Rate-limit tracking: X-RateLimit-Remaining / X-RateLimit-Reset are
 *   read after every response; callers slow down BEFORE the limit.
 */
import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_LOCK_STALE_MS = 30 * 60 * 1000; // 30 min: longer than any workflow timeout

export function isOutageStatus(status) {
  return status === 403 || (status >= 500 && status <= 599);
}

export function isRetriableStatus(status) {
  return status === 429 || isOutageStatus(status);
}

/* Delay before retrying a retriable response: honour Retry-After when the
 * server sends it (capped at 65 s), otherwise grow with the attempt. */
export function retryDelayMs(headers, attempt) {
  let seconds = NaN;
  try { seconds = Number(headers?.get?.('Retry-After')); } catch {}
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(65000, Math.ceil(seconds * 1000));
  return 2000 * attempt;
}

/* Mutable rate state shared by one script run. */
export function createRateState() {
  return { remaining: null, limit: null, resetAt: 0 };
}

export function noteRateHeaders(state, headers) {
  try {
    const remaining = Number(headers?.get?.('X-RateLimit-Remaining') ?? NaN);
    const limit = Number(headers?.get?.('X-RateLimit-Limit') ?? NaN);
    const reset = Number(headers?.get?.('X-RateLimit-Reset') ?? NaN);
    if (Number.isFinite(remaining)) state.remaining = remaining;
    if (Number.isFinite(limit)) state.limit = limit;
    if (Number.isFinite(reset) && reset > 0) state.resetAt = reset * 1000;
  } catch {}
  return state;
}

/* Milliseconds the caller must wait before its next request: with 2 or
 * fewer requests left in the window, wait for the reset instead of
 * firing into a 429. Returns 0 when there is budget left. */
export function rateWaitMs(state, now = Date.now()) {
  if (state.remaining !== null && state.remaining <= 2) {
    if (state.resetAt > now) return state.resetAt - now;
    if (state.remaining <= 0) return 5000;
  }
  return 0;
}

function readLock(lockPath) {
  try {
    const raw = fs.readFileSync(lockPath, 'utf8');
    const parsed = JSON.parse(raw);
    return { raw, startedAt: Number(parsed.startedAt) || 0, pid: parsed.pid || null, label: parsed.label || '' };
  } catch {
    try {
      const stat = fs.statSync(lockPath);
      return { raw: '', startedAt: stat.mtimeMs || 0, pid: null, label: '' };
    } catch { return null; }
  }
}

/* Try to take the lock. Returns a release function, or null when a fresh
 * lock is already held. A lock older than staleMs is stale (its owner
 * died) and is taken over. The release only removes the lock while this
 * process still owns it. */
export function acquireLock(lockPath, { staleMs = DEFAULT_LOCK_STALE_MS, label = 'refresh', now = Date.now() } = {}) {
  fs.mkdirSync(path.dirname(path.resolve(lockPath)), { recursive: true });
  const payload = JSON.stringify({ pid: process.pid, label, startedAt: now, host: process.env.HOSTNAME || '' }) + '\n';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.writeFileSync(lockPath, payload, { flag: 'wx' });
      let released = false;
      return function release() {
        if (released) return;
        released = true;
        try {
          const current = fs.readFileSync(lockPath, 'utf8');
          if (current === payload) fs.rmSync(lockPath, { force: true });
        } catch {}
      };
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const held = readLock(lockPath);
      const age = held ? now - (held.startedAt || 0) : Infinity;
      if (held && age >= staleMs) {
        try { fs.rmSync(lockPath, { force: true }); } catch {}
        continue;
      }
      return null;
    }
  }
  return null;
}

/* Script entry helper: take the lock or exit cleanly (code 0) with a
 * clear log line. Registers release on process exit as a backstop. */
export function acquireLockOrExit(lockPath, { staleMs, label = 'refresh' } = {}) {
  const release = acquireLock(lockPath, { staleMs, label });
  if (!release) {
    console.log('[refresh-lock] Another ' + label + ' run is already in progress (lock: ' + lockPath + '); skipping this run to protect the AniList rate limit.');
    process.exit(0);
  }
  process.on('exit', () => { try { release(); } catch {} });
  return release;
}
