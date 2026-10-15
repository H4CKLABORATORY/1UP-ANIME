/* Validate ONEUP monitoring report schema and audit consistency.
 * Never marks a failing production check "healthy".
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
const status=JSON.parse(fs.readFileSync('data/guard/status.json','utf8'));
const history=JSON.parse(fs.readFileSync('data/guard/history.json','utf8'));
assert.equal(status.schemaVersion,1);
assert.equal(status.engine,'ONEUP SELF HEALING ENGINE');
assert(['correcto','atencion','fallo'].includes(status.verdict));
assert(Array.isArray(status.checks)&&status.checks.length>=25,'Expected core health checks');
assert.equal(status.totalChecks,status.checks.length);
assert.equal(status.critical,status.checks.filter(x=>x.level==='critical').length);
assert.equal(status.warnings,status.checks.filter(x=>x.level==='warning').length);
assert(Array.isArray(status.persistentAlerts));
assert(Array.isArray(history.checks)&&history.checks.length>=1);
assert(history.checks.length<=72);
assert.equal(history.checks[0].at,status.updatedAt);
assert(!status.checks.some(x=>/Bearer |AIza|secret_key|private_key/.test(JSON.stringify(x))),'Sensitive value in monitoring output');
console.log('ONEUP guard report schema valid ('+status.totalChecks+' checks, '+status.verdict+').');
