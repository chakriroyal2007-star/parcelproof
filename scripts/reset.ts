import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
// Explicit demo reset. Stop the server first; no other project files are touched.
const path=resolve(process.env.PARCELPROOF_DB||'data/parcelproof.sqlite');
for(const suffix of ['', '-wal', '-shm'])rmSync(path+suffix,{force:true});
const { db }=await import('../lib/db');db();console.log('Synthetic cases reset. Run npm run ingest again if using live AI.');
