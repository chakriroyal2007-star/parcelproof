import { copyFileSync, constants, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error('ParcelProof needs Node 22.13+; use Node 22.23.2 to match the verified environment.');
  process.exit(1);
}
if (!existsSync('node_modules/tsx')) {
  console.error('Install dependencies first: npm ci');
  process.exit(1);
}
try {
  copyFileSync('.env.example', '.env.local', constants.COPYFILE_EXCL);
  console.log('Created .env.local in fixture mode.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('Kept your existing .env.local unchanged.');
}
const result = spawnSync(process.execPath, ['--import', 'tsx', '--env-file=.env.local', 'scripts/seed.ts'], { stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log('Setup complete. Run npm run doctor, then npm run dev.');
