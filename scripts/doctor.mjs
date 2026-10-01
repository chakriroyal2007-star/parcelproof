import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
if (existsSync('.env.local')) loadEnvFile('.env.local');
let failures = 0;
function check(ok, description) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${description}`);
  if (!ok) failures++;
}
const [major, minor] = process.versions.node.split('.').map(Number);
check(major > 22 || (major === 22 && minor >= 13), `Node ${process.versions.node}; requires 22.13+`);
check(existsSync('node_modules/next/package.json') && existsSync('node_modules/tsx/package.json'), 'Dependencies installed');
check(existsSync('.env.local'), '.env.local exists (npm run setup creates it)');
try {
  const { DatabaseSync } = await import('node:sqlite');
  const database = new DatabaseSync(':memory:');
  database.exec('CREATE TABLE check_sqlite(id INTEGER)');
  database.close();
  check(true, 'Built-in SQLite can create a database');
} catch { check(false, 'Built-in SQLite unavailable; check Node version'); }
let temporary;
try {
  const directory = dirname(resolve(process.env.PARCELPROOF_DB || 'data/parcelproof.sqlite'));
  mkdirSync(directory, { recursive: true });
  temporary = mkdtempSync(join(directory, '.parcelproof-doctor-'));
  writeFileSync(join(temporary, 'check'), 'writable');
  check(true, 'Database directory is writable');
} catch { check(false, 'Database directory is not writable'); }
finally { if (temporary) rmSync(temporary, { recursive: true, force: true }); }
const mode = process.env.AI_MODE || 'fixture';
check(['fixture', 'live'].includes(mode), 'AI_MODE is fixture or live');
check(Number.isFinite(Date.parse(process.env.DEMO_NOW || '2026-10-01T12:00:00.000Z')), 'Scenario clock is a valid timestamp');
if (mode === 'live') check(Boolean(process.env.OPENAI_API_KEY?.trim()), 'Live API key is configured (value never printed)');
console.log(`Mode: ${mode}. No network calls or paid inference were made.`);
console.log(mode === 'live' ? 'Next: npm run ingest, then npm run evaluate:live.' : 'Next: npm run dev; open http://127.0.0.1:3000.');
process.exitCode = failures ? 1 : 0;
