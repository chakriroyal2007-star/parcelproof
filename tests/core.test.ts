import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.PARCELPROOF_DB=join(mkdtempSync(join(tmpdir(),'parcelproof-test-')),'test.sqlite');
process.env.AI_MODE='fixture';
const {db,getCase,getOrder,getRefund,orderSources,policies,getAudits}=await import('../lib/db');
const {analyze,approve,validateReferences,validateExtraction,fixtureExtraction,saveHandoff,eligibility,validateNarrative}=await import('../lib/engine');
const {retrieve,chunkText,cosine,ingest}=await import('../lib/retrieval');

test('ingestion creates real source chunks without pretending fixture embeddings exist',async()=>{
 const result=await ingest(false);assert.ok(result.chunks>result.sources);assert.equal(result.embedded,0);
 assert.equal((db().prepare('SELECT count(*) as n FROM chunks WHERE vector IS NOT NULL').get() as {n:number}).n,0);
});
test('chunk overlap preserves the complete document',()=>{const text='abcdefghij'.repeat(100);const parts=chunkText(text,100,20);assert.equal(parts[0].slice(-20),parts[1].slice(0,20));assert.ok(parts.at(-1)?.endsWith(text.slice(-20)));assert.throws(()=>chunkText(text,20,20));});
test('cosine ranking uses numerical embeddings and rejects incompatible dimensions',()=>{assert.equal(cosine([1,0],[1,0]),1);assert.equal(cosine([1,0],[0,1]),0);assert.throws(()=>cosine([1],[1,0]));});
test('retrieval applies account and order scope before any ranking',async()=>{
 const passages=await retrieve(getOrder('PP-1042'),'PP-1044 Jordan coffee refund reception');
 assert.ok(passages.length);assert.ok(passages.every(p=>p.source.orderId===null||p.source.orderId==='PP-1042'));
 assert.ok(passages.every(p=>!p.passage.includes('Jordan')));assert.ok(passages.every(p=>p.source.id!=='POL-US-1'));
});
test('shared household never inherits another order’s promises',async()=>{
 const a=await analyze('PP-1044');assert.equal(a.promises.length,0);assert.equal(a.gate.action,'escalate');assert.ok(a.gate.missing.some(s=>s.includes('authorization')));
 assert.equal(a.accountContext.length,1);assert.ok(a.evidence.every(p=>!p.passage.includes('headphones')&&!p.passage.includes('PP-1042')));
});
test('broken promise is exact, overdue and distinct from financial state',async()=>{
 const a=await analyze('PP-1042');assert.equal(a.promises[0].quote,'Your refund will be initiated within 24 hours.');assert.equal(a.promises[0].status,'overdue');assert.equal(a.promises[0].deadline,'2026-10-01T09:00:00.000Z');assert.equal(getRefund('PP-1042').status,'not_initiated');assert.equal(a.gate.action,'initiate_refund');
 assert.ok(a.narrative.headline.text.includes('No initiation'));assert.equal(a.narrative.conflicts.length,1);
});
test('all material fixture citations resolve to current scoped source records',async()=>{
 for(const id of ['PP-1042','PP-1043','PP-1044','PP-1045']){const a=await analyze(id);const c=getCase(id);validateReferences(a.narrative,[...c.sources,...c.accountContext]);validateReferences(a.extraction,c.sources);}
});
test('fabricated and cross-order references are rejected',()=>{assert.throws(()=>validateReferences({sourceIds:['INVENTED']},getCase('PP-1042').sources));assert.throws(()=>validateReferences({sourceIds:['SUP-1044-01']},getCase('PP-1042').sources));});
test('invented promise quotation is rejected',()=>{const ss=orderSources(getOrder('PP-1042'));const ex=fixtureExtraction(ss);ex.commitments[0].quote='I promise one million dollars';assert.throws(()=>validateExtraction(ex,ss));});
test('missing evidence and missing applicable policy force abstention',async()=>{
 const a=await analyze('PP-1045');assert.equal(a.gate.action,'escalate');assert.ok(a.gate.missing.includes('Courier delivery scan'));assert.ok(a.gate.missing.includes('Applicable delivery-dispute policy'));assert.equal(a.promises.length,0);assert.equal(policies(getOrder('PP-1045')).length,0);
});
test('expired policy is excluded from applicability',()=>{assert.deepEqual(policies(getOrder('PP-1042')).map(p=>p.id),['POL-US-2']);});
test('existing initiation fulfills promise but never establishes payment completion',async()=>{
 const a=await analyze('PP-1043');assert.equal(a.promises[0].status,'fulfilled');assert.equal(a.promises[0].actionRecord,'ACT-SEED-1043');assert.equal(a.gate.action,'review_refund');const before=getRefund('PP-1043');approve('PP-1043','Priya Shah','review-existing-1043',a.id);assert.deepEqual(getRefund('PP-1043'),before);assert.equal(getAudits('PP-1043').filter(x=>x.kind==='initiate_refund').length,1);
});
test('output cannot claim completion or change policy decision',async()=>{
 const a=await analyze('PP-1042');const n=structuredClone(a.narrative);n.reply[0].text='Your refund was processed.';assert.throws(()=>validateNarrative(n,getOrder('PP-1042'),a.gate,getCase('PP-1042').sources));
 n.reply[0].text='We have initiated your refund.';assert.throws(()=>validateNarrative(n,getOrder('PP-1042'),a.gate,getCase('PP-1042').sources));
 n.reply[0].text='I am sorry.';n.recommendation.action='escalate';assert.throws(()=>validateNarrative(n,getOrder('PP-1042'),a.gate,getCase('PP-1042').sources));
});
test('stale analysis cannot authorize an action',async()=>{const a=await analyze('PP-1042');await analyze('PP-1042');assert.throws(()=>approve('PP-1042','Priya Shah','stale-key-1042',a.id));assert.equal(getRefund('PP-1042').status,'not_initiated');});
test('approval is atomic, idempotent and refreshes promise plus persisted handoff',async()=>{
 const a=await analyze('PP-1042');const result=approve('PP-1042','Priya Shah','same-refund-key-1042',a.id);assert.equal(result.duplicate,false);assert.equal(getRefund('PP-1042').status,'initiated');
 const again=approve('PP-1042','Priya Shah','same-refund-key-1042',a.id);assert.equal(again.duplicate,true);
 assert.throws(()=>approve('PP-1044','Priya Shah','same-refund-key-1042',a.id));
 const c=getCase('PP-1042');assert.equal(c.analysis?.promises[0].status,'fulfilled');assert.ok(c.handoff?.summary.some(s=>s.sourceIds.includes(getRefund('PP-1042').actionId!)));assert.equal(c.audits.filter(a=>a.kind==='initiate_refund').length,1);
});
test('new idempotency key after re-analysis still cannot initiate a duplicate',async()=>{const a=await analyze('PP-1042');assert.equal(a.gate.action,'review_refund');approve('PP-1042','Priya Shah','new-review-key-1042',a.id);assert.equal(getAudits('PP-1042').filter(a=>a.kind==='initiate_refund').length,1);});
test('handoff persists across a shift and retains completed action citations',()=>{saveHandoff('PP-1042','Priya Shah');db().prepare('INSERT INTO sessions VALUES(?,?) ON CONFLICT(orderId) DO UPDATE SET agent=excluded.agent').run('PP-1042','Daniel Kim');const c=getCase('PP-1042');assert.equal(c.activeAgent,'Daniel Kim');assert.equal(c.handoff?.agent,'Priya Shah');assert.ok(c.handoff?.summary.some(s=>s.text.includes('reception')));assert.ok(c.handoff?.summary.some(s=>s.sourceIds.includes(getRefund('PP-1042').actionId!)));});
test('insufficient-evidence approval records escalation and never a refund',async()=>{const a=await analyze('PP-1045');approve('PP-1045','Priya Shah','escalate-1045',a.id);assert.equal(getRefund('PP-1045').status,'not_initiated');assert.equal(getAudits('PP-1045')[0].kind,'escalate');assert.equal(eligibility(getOrder('PP-1045')).eligible,false);});

test('promise speaker and relative deadline must match the quoted evidence',()=>{
 const ss=orderSources(getOrder('PP-1042'));const ex=fixtureExtraction(ss);ex.commitments[0].speaker='Invented agent';assert.throws(()=>validateExtraction(ex,ss),/speaker/);
 ex.commitments[0].speaker='Maya Chen';ex.commitments[0].deadline='2026-10-03T09:00:00.000Z';assert.throws(()=>validateExtraction(ex,ss),/deadline/);
});
