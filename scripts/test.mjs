import { readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const dbPath = resolve(process.env.PARCELPROOF_DB || 'data/parcelproof.sqlite');

const files = readdirSync('tests').filter(name => name.endsWith('.test.ts')).sort().map(name => join('tests', name));
if (!files.length) throw new Error('No tests found. Run from the ParcelProof directory.');

let totalExit = 0;
for (const file of files) {
  for (const suffix of ['', '-wal', '-shm']) {
    rmSync(dbPath + suffix, { force: true });
  }
  const res = spawnSync(
    process.execPath,
    ['--import', 'tsx', '--test', file],
    { stdio: 'inherit', env: { ...process.env, AI_MODE: 'fixture' } }
  );
  if (res.status !== 0) {
    totalExit = res.status || 1;
  }
}

process.exitCode = totalExit;
