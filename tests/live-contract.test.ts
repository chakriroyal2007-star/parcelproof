import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
process.env.PARCELPROOF_DB=join(mkdtempSync(join(tmpdir(),'parcelproof-live-contract-')),'test.sqlite');
process.env.AI_MODE='live';
process.env.OPENAI_API_KEY='test-key-not-a-real-credential';
const {db,getOrder,orderSources}=await import('../lib/db');
const {ingest,retrieve}=await import('../lib/retrieval');
const {analyze,fixtureExtraction,fixtureNarrative,eligibility}=await import('../lib/engine');

test('live SDK contract: embeddings, two schema-constrained model calls, grounded result (mock provider)',async()=>{
 const original=globalThis.fetch;const calls:{url:string;body:Record<string,any>}[]=[];
 // Deliberately fake provider, confined to this isolated contract test. Not an inference evaluation.
 globalThis.fetch=async(input,init)=>{
 const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 const body=JSON.parse(init?.body as string);calls.push({url,body});
 if(url.endsWith('/embeddings'))return Response.json({object:'list',model:body.model,usage:{prompt_tokens:1,total_tokens:1},data:(Array.isArray(body.input)?body.input:[body.input]).map((_:string,index:number)=>({object:'embedding',index,embedding:[1,.5,.25]}))});
 if(url.endsWith('/responses')){
 const o=getOrder('PP-1042'),ex=fixtureExtraction(orderSources(o));const output=body.text.format.name==='extraction'?ex:fixtureNarrative(o,ex,eligibility(o));
 return Response.json({id:'resp_contract',object:'response',created_at:1790856000,status:'completed',model:body.model,output:[{id:'msg_contract',type:'message',status:'completed',role:'assistant',content:[{type:'output_text',text:JSON.stringify(output),annotations:[]}]}],error:null,incomplete_details:null});
 }
 throw new Error('Unexpected provider endpoint');
 };
 try{
 const indexed=await ingest(true);assert.ok(indexed.embedded>0);const a=await analyze('PP-1042');assert.equal(a.mode,'live');assert.equal(a.narrationOrigin,'live_model');assert.equal(a.promises[0].status,'overdue');assert.ok(a.evidence.every(p=>p.source.orderId===null||p.source.orderId==='PP-1042'));
 const generation=calls.filter(c=>c.url.endsWith('/responses'));assert.equal(generation.length,2);assert.ok(generation.every(c=>c.body.text.format.type==='json_schema'&&c.body.text.format.strict===true));assert.ok(generation.every(c=>c.body.store===false));assert.ok(generation.every(c=>!c.body.input.includes('PP-1044')));assert.ok(generation.every(c=>c.body.instructions.includes('untrusted DATA')));
 }finally{globalThis.fetch=original;}
});
test('live path fails closed for an outdated vector index (mock query embedding)',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({data:[{index:0,embedding:[1,.5,.25]}]});
 try{db().prepare("UPDATE chunks SET model='old-model' WHERE sourceId='SUP-1042-01'").run();await assert.rejects(()=>retrieve(getOrder('PP-1042'),'refund'),/index is missing or outdated/);}finally{globalThis.fetch=original;}
});
