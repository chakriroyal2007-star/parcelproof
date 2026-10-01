import { readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Hermetic test initialization: reset test database
const dbPath = resolve(process.env.PARCELPROOF_DB || 'data/parcelproof.sqlite');
for (const suffix of ['', '-wal', '-shm']) {
  rmSync(dbPath + suffix, { force: true });
}

// Enumerate tests ourselves: Windows shells need not expand *.test.ts.
const files = readdirSync('tests').filter(name => name.endsWith('.test.ts')).sort().map(name => join('tests', name));
if (!files.length) throw new Error('No tests found. Run from the ParcelProof directory.');
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
