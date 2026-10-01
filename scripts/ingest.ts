import { ingest } from '../lib/retrieval';
ingest().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
