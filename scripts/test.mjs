import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
// Enumerate tests ourselves: Windows shells need not expand *.test.ts.
const files = readdirSync('tests').filter(name => name.endsWith('.test.ts')).sort().map(name => join('tests', name));
if (!files.length) throw new Error('No tests found. Run from the ParcelProof directory.');
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
