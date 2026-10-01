import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.PARCELPROOF_DB = join(mkdtempSync(join(tmpdir(), 'parcelproof-dynrag-')), 'dynrag.sqlite');
process.env.AI_MODE = 'fixture';

const { 
  getOrder, 
  getRefund, 
  addCustomerMessage, 
  createCustomerDispute,
  db 
} = await import('../lib/db');
const { LLMService, answerCustomerQuestion } = await import('../lib/llm-service');
const { retrieve } = await import('../lib/retrieval');
const { approve, analyze } = await import('../lib/engine');
import type { User } from '../lib/types';

test('DYNAMIC RAG: Newly submitted user message is immediately indexed and retrievable', async () => {
  const caseId = 'PP-1042';
  const customStatement = 'My apartment security desk was closed yesterday and I never received the package.';
  
  // 1. Submit a completely new customer message
  const newSource = addCustomerMessage(caseId, 'Alex Morgan', customStatement);
  assert.ok(newSource.id);
  assert.ok(newSource.text.includes('security desk was closed'));

  // 2. Query RAG with dynamic user question
  const alexUser: User = {
    id: 'USR-CUST-1042',
    email: 'alex@example.com',
    name: 'Alex Morgan',
    role: 'CUSTOMER',
    accountId: 'HH-208'
  };

  const response = await answerCustomerQuestion(caseId, 'What did I say about the security desk?', alexUser);
  assert.ok(response.answer.includes('security desk') || response.answer.includes('closed yesterday'), 'Must reference newly submitted message');
  assert.ok(response.citations?.includes(newSource.id), 'Must cite newly created source ID');
});

test('DYNAMIC RESPONSE: Answer changes dynamically when database financial state changes', async () => {
  const caseId = 'PP-1042';
  const alexUser: User = {
    id: 'USR-CUST-1042',
    email: 'alex@example.com',
    name: 'Alex Morgan',
    role: 'CUSTOMER',
    accountId: 'HH-208'
  };

  // 1. Before approval: refund status is not_initiated
  const beforeAnswer = await LLMService.answerCaseQuestion(caseId, 'Was my refund processed?');
  assert.ok(beforeAnswer.answer.toLowerCase().includes('no refund') || beforeAnswer.answer.toLowerCase().includes('not_initiated'));

  // 2. Approve simulated refund in SQLite ledger
  const analysis = await analyze(caseId);
  const approval = approve(caseId, 'Daniel Kim', 'dynamic-test-key-01', analysis.id);
  assert.ok(!approval.duplicate);

  // 3. After approval: refund status is now initiated
  const afterAnswer = await LLMService.answerCaseQuestion(caseId, 'Was my refund processed?');
  assert.ok(afterAnswer.answer.toLowerCase().includes('initiated') || afterAnswer.answer.toLowerCase().includes('action'));
  assert.notEqual(beforeAnswer.answer, afterAnswer.answer, 'Answer must change dynamically based on database state');
});

test('INSUFFICIENT EVIDENCE: Queries about non-existent records abstain without fabrication', async () => {
  const caseId = 'PP-1042';
  const answer = await LLMService.answerCaseQuestion(caseId, 'Did the courier call me on my mobile phone?');
  assert.equal(answer.status, 'INSUFFICIENT_EVIDENCE');
  assert.ok(answer.answer.toLowerCase().includes('couldn\'t find') || answer.answer.toLowerCase().includes('insufficient'));
});

test('OUT OF SCOPE QUERIES: Unrelated questions return appropriate scope disclaimer', async () => {
  const caseId = 'PP-1042';
  const answer = await LLMService.answerCaseQuestion(caseId, 'What is the weather forecast for tomorrow?');
  assert.equal(answer.status, 'INSUFFICIENT_EVIDENCE');
  assert.ok(answer.answer.includes('outside the scope'));
});

test('CROSS-CASE ISOLATION: Case A cannot retrieve Case B records', async () => {
  const passages = await retrieve(getOrder('PP-1045'), 'Studio wireless headphones reception Alex Morgan');
  // All retrieved passages must strictly belong to PP-1045 or universal policies
  for (const p of passages) {
    assert.ok(p.source.orderId === 'PP-1045' || p.source.orderId === null, 'Must never retrieve PP-1042 sources');
    assert.ok(!p.passage.includes('Alex Morgan'));
  }
});
