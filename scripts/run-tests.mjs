#!/usr/bin/env node
/* 1UP Anime — `npm test` aggregator (Phase 1 reproducibility gate).
 * Runs the offline suites in one command, in order:
 *   1. Node unit tests (node --test tests/*.test.mjs)
 *   2. Python unit tests (python3 -m unittest discover -s tests -p "test_*.py")
 *   3. Script assertion checks (scripts/test-*.mjs)
 * Browser suites stay separate (they need downloaded browsers + a server):
 *   npm run test:e2e        (Playwright, all specs)
 *   npm run test:puppeteer   (Puppeteer site audit)
 * Both run in the deploy gate (.github/workflows/deploy-pages.yml).
 * Exit code is non-zero if any suite fails. No network is required:
 * every suite uses local fixtures, fake backends or a local server.
 * The Supabase-backed auth tests skip themselves when the local
 * Supabase stack is not running (see tests/auth-supabase.test.mjs);
 * run them for real with `npm run test:auth:supabase:local`.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nodeTests = fs.readdirSync(path.join(repo, 'tests'))
  .filter((f) => f.endsWith('.test.mjs'))
  .sort()
  .map((f) => path.join('tests', f));
const scriptTests = fs.readdirSync(path.join(repo, 'scripts'))
  .filter((f) => f.startsWith('test-') && f.endsWith('.mjs'))
  .sort()
  .map((f) => path.join('scripts', f));

const suites = [
  { name: 'node', cmd: process.execPath, args: ['--test', ...nodeTests] },
  { name: 'python', cmd: 'python3', args: ['-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py'] },
  ...scriptTests.map((f) => ({ name: f, cmd: process.execPath, args: [f] })),
];

function run(suite) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(suite.cmd, suite.args, { cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; process.stdout.write(d); });
    child.stderr.on('data', (d) => { out += d; process.stderr.write(d); });
    child.on('error', (err) => resolve({ ...suite, code: 1, seconds: (Date.now() - started) / 1000, out, error: String(err) }));
    child.on('close', (code) => resolve({ ...suite, code: code ?? 1, seconds: (Date.now() - started) / 1000, out }));
  });
}

function counts(suite, out) {
  if (suite.name === 'node') {
    const get = (k) => { const m = out.match(new RegExp('# ' + k + ' (\\d+)')); return m ? m[1] : '?'; };
    return get('tests') + ' tests, ' + get('pass') + ' pass, ' + get('fail') + ' fail, ' + get('skipped') + ' skipped';
  }
  if (suite.name === 'python') {
    const m = out.match(/Ran (\d+) tests?/);
    const ok = /^OK$/m.test(out);
    return (m ? m[1] + ' tests, ' : '') + (ok ? 'OK' : 'FAILED');
  }
  return '';
}

const results = [];
for (const suite of suites) {
  console.log('\n=== 1UP test: ' + suite.name + ' ===');
  results.push(await run(suite));
}
console.log('\n=== 1UP test summary ===');
let failed = 0;
for (const r of results) {
  const detail = counts(r, r.out);
  const status = r.code === 0 ? 'PASS' : 'FAIL';
  if (r.code !== 0) failed += 1;
  console.log(status + ' ' + r.name + ' (' + r.seconds.toFixed(1) + 's)' + (detail ? ' — ' + detail : '') + (r.error ? ' — ' + r.error : ''));
}
if (failed > 0) {
  console.log(failed + ' suite(s) failed.');
  process.exit(1);
}
console.log('All ' + results.length + ' suites passed.');
