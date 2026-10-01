import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
// Fail before ingestion to avoid silently reporting fixture output as live evidence.
if (process.env.AI_MODE !== 'live' || !process.env.OPENAI_API_KEY?.trim()) {
  console.error('Set AI_MODE=live and OPENAI_API_KEY in .env.local first. This command makes paid API calls against synthetic data.');
  process.exit(1);
}
mkdirSync('data', { recursive: true });
process.env.PARCELPROOF_DB = join(mkdtempSync(resolve('data/live-evaluation-')), 'evaluation.sqlite');
const { ingest } = await import('../lib/retrieval');
const { analyze, validateReferences } = await import('../lib/engine');
const { getCase } = await import('../lib/db');
const report: { startedAt: string; mode: string; database: string; model: string; embeddingModel: string; results: unknown[]; limitations: string[] } = {
  startedAt: new Date().toISOString(), mode: 'live', database: process.env.PARCELPROOF_DB,
  model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  results: [], limitations: ['Four synthetic cases; no statistical accuracy claim.', 'Automated checks validate shape, scope and expected behavior, not semantic entailment.', 'Manual inspection of generated prose is still required. No actions are approved.']
};
try {
  console.log('Ingesting real embeddings into a separate evaluation database…');
  await ingest(true);
  for (const [id, action] of [['PP-1042', 'initiate_refund'], ['PP-1043', 'review_refund'], ['PP-1044', 'escalate'], ['PP-1045', 'escalate']]) {
    const start = performance.now();
    try {
      const analysis = await analyze(id);
      const current = getCase(id);
      validateReferences(analysis.narrative, [...current.sources, ...current.accountContext]);
      const checks = {
        liveOutput: analysis.mode === 'live' && analysis.narrationOrigin === 'live_model',
        expectedAction: analysis.gate.action === action && analysis.narrative.recommendation.action === action,
        scopedEvidence: analysis.evidence.every(p => !p.source.orderId || p.source.orderId === id),
        expectedPromise: id === 'PP-1042' ? analysis.promises.some(p => p.status === 'overdue') : id === 'PP-1043' ? analysis.promises.some(p => p.status === 'fulfilled') : analysis.promises.length === 0,
        noNewAction: current.audits.length === (id === 'PP-1043' ? 1 : 0)
      };
      const passed = Object.values(checks).every(Boolean);
      report.results.push({ id, passed, elapsedMs: Math.round(performance.now() - start), checks, analysis });
      console.log(`${passed ? 'PASS' : 'FAIL'} ${id}; inspect generated citations and text in the report.`);
      if (!passed) process.exitCode = 1;
    } catch (error) {
      const message = (error instanceof Error ? error.message : 'Unknown error').replaceAll(process.env.OPENAI_API_KEY!, '[REDACTED]');
      report.results.push({ id, passed: false, elapsedMs: Math.round(performance.now() - start), error: message });
      console.error(`FAIL ${id}: ${message}`); process.exitCode = 1;
    }
  }
} catch (error) {
  const message = (error instanceof Error ? error.message : 'Unknown error').replaceAll(process.env.OPENAI_API_KEY!, '[REDACTED]');
  report.results.push({ stage: 'ingestion', passed: false, error: message });
  console.error(`Ingestion failed: ${message}`); process.exitCode = 1;
} finally {
  mkdirSync('reports', { recursive: true });
  writeFileSync('reports/live-evaluation.json', JSON.stringify(report, null, 2));
  console.log('Saved reports/live-evaluation.json. No demo records or refund actions were changed.');
}
