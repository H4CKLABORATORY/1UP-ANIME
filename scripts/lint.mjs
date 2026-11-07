#!/usr/bin/env node
/* 1UP Anime — `npm run lint` (Phase 1). Zero dependencies, runs offline.
 * Checks:
 *   1. Syntax: `node --check` on every *.js / *.mjs (except node_modules, .git).
 *   2. Python: `python3 -m py_compile` on every *.py (same exclusions).
 *   3. JSON: every *.json parses (same exclusions).
 *   4. No-Jikan guard: no runtime .js / .mjs / .html / .py file may
 *      reference the dead Jikan API host (removed 2026-11-07; the API
 *      died 2026-10-01). Docs may still mention Jikan historically and
 *      tests assert its absence, so tests/ is excluded.
 *   5. No-Firebase guard: package.json / package-lock.json must not list
 *      Firebase packages, and no .js / .mjs / .html may import, require or
 *      load one (the accounts rework deleted Firebase; the same rule is
 *      asserted for auth.js by tests/auth-email.test.mjs).
 * Exit code is non-zero if any check fails; every failure is listed.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', '.git']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (entry.isFile()) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const files = walk(repo);
const jsFiles = files.filter((f) => f.endsWith('.js') || f.endsWith('.mjs'));
const pyFiles = files.filter((f) => f.endsWith('.py'));
const jsonFiles = files.filter((f) => f.endsWith('.json'));
const htmlFiles = files.filter((f) => f.endsWith('.html'));

function check(cmd, args) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => resolve(String(e)));
    child.on('close', (code) => resolve(code === 0 ? null : err.trim().split('\n').slice(0, 3).join('\n')));
  });
}

const failures = [];
async function checkAll(label, list, fn) {
  let ok = 0;
  for (const f of list) {
    const problem = await fn(f);
    if (problem) failures.push(label + ': ' + path.relative(repo, f) + '\n' + problem);
    else ok += 1;
  }
  console.log(label + ': ' + ok + '/' + list.length + ' ok');
  return ok;
}

await checkAll('node --check', jsFiles, (f) => check(process.execPath, ['--check', f]));
await checkAll('py_compile', pyFiles, (f) => check('python3', ['-m', 'py_compile', f]));
let jsonOk = 0;
for (const f of jsonFiles) {
  try { JSON.parse(fs.readFileSync(f, 'utf8')); jsonOk += 1; }
  catch (e) { failures.push('json: ' + path.relative(repo, f) + '\n' + String(e.message)); }
}
console.log('json: ' + jsonOk + '/' + jsonFiles.length + ' ok');

// No-Firebase guard.
const manifest = fs.readFileSync(path.join(repo, 'package.json'), 'utf8')
  + fs.readFileSync(path.join(repo, 'package-lock.json'), 'utf8');
if (/firebase/i.test(manifest)) failures.push('no-firebase: package.json or package-lock.json mentions Firebase');
const importPattern = /(?:require\s*\(\s*|from\s+|import\s*\(\s*|import\s+)['"]@?firebase|firebase-admin|firebase-functions/;
const selfFile = fileURLToPath(import.meta.url);
for (const f of [...jsFiles, ...htmlFiles]) {
  if (f === selfFile) continue; // the guard itself names what it guards against
  const src = fs.readFileSync(f, 'utf8');
  if (importPattern.test(src) || (f.endsWith('.html') && /firebase/i.test(src))) {
    failures.push('no-firebase: ' + path.relative(repo, f) + ' references Firebase');
  }
}
console.log('no-firebase: ' + (failures.some((x) => x.startsWith('no-firebase')) ? 'FAIL' : 'ok'));

// No-Jikan guard: the metadata chain is AniList -> snapshot cache -> BASIC
// local fallback. The host is built from parts so this guard does not
// trip over its own literal.
const jikanHost = 'api.' + 'jikan' + '.moe';
for (const f of [...jsFiles, ...htmlFiles, ...pyFiles]) {
  if (f === selfFile) continue; // the guard itself names what it guards against
  if (path.relative(repo, f).startsWith('tests' + path.sep)) continue;
  const src = fs.readFileSync(f, 'utf8');
  if (src.includes(jikanHost)) {
    failures.push('no-jikan: ' + path.relative(repo, f) + ' references the dead Jikan API');
  }
}
console.log('no-jikan: ' + (failures.some((x) => x.startsWith('no-jikan')) ? 'FAIL' : 'ok'));

if (failures.length > 0) {
  console.log('\nLint failed (' + failures.length + ' problem(s)):');
  for (const f of failures) console.log('---\n' + f);
  process.exit(1);
}
console.log('\nLint passed.');
