import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { orders, sources, FIXTURE_NOW } from './fixtures';
import type { 
  Order, 
  Source, 
  Refund, 
  Audit, 
  CaseData, 
  Analysis, 
  CaseMemory, 
  CaseMemoryItem,
  Commitment, 
  RiskSignal, 
  AIChatMessage, 
  NextAgentBrief 
} from './types';

let connection: DatabaseSync | undefined;
export const now = () => process.env.DEMO_NOW || FIXTURE_NOW;
export const mode = (): 'fixture'|'live' => {
  if (process.env.AI_MODE === 'fixture') return 'fixture';
  if (process.env.AI_MODE === 'live') return 'live';
  if (process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY) return 'live';
  return 'fixture';
};

function getDbPath(): string {
  if (process.env.PARCELPROOF_DB) return resolve(process.env.PARCELPROOF_DB);
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production') {
    return '/tmp/parcelproof.sqlite';
  }
  return resolve('data/parcelproof.sqlite');
}

export function db() {
  if (connection) return connection;
  let path = getDbPath();
  try {
    mkdirSync(dirname(path), { recursive: true });
    connection = new DatabaseSync(path);
  } catch (err) {
    path = '/tmp/parcelproof.sqlite';
    try {
      mkdirSync(dirname(path), { recursive: true });
    } catch {}
    connection = new DatabaseSync(path);
  }
  connection.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, accountId TEXT NOT NULL, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sources(id TEXT PRIMARY KEY, accountId TEXT, orderId TEXT, type TEXT NOT NULL, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS refunds(orderId TEXT PRIMARY KEY REFERENCES orders(id), status TEXT NOT NULL, actionId TEXT, updatedAt TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS chunks(id TEXT PRIMARY KEY, sourceId TEXT REFERENCES sources(id), text TEXT NOT NULL, vector TEXT, model TEXT);
  CREATE TABLE IF NOT EXISTS analyses(orderId TEXT PRIMARY KEY REFERENCES orders(id), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS handoffs(orderId TEXT PRIMARY KEY REFERENCES orders(id), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS drafts(orderId TEXT PRIMARY KEY REFERENCES orders(id), text TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions(orderId TEXT PRIMARY KEY REFERENCES orders(id), agent TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS audits(id TEXT PRIMARY KEY, orderId TEXT REFERENCES orders(id), agent TEXT NOT NULL, kind TEXT NOT NULL, at TEXT NOT NULL, detail TEXT NOT NULL, key TEXT UNIQUE NOT NULL);
  CREATE TABLE IF NOT EXISTS case_memories(orderId TEXT PRIMARY KEY REFERENCES orders(id), data TEXT NOT NULL, updatedAt TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS commitments(id TEXT PRIMARY KEY, orderId TEXT REFERENCES orders(id), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS ai_conversations(orderId TEXT PRIMARY KEY REFERENCES orders(id), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS next_agent_briefs(orderId TEXT PRIMARY KEY REFERENCES orders(id), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS ai_audits(id TEXT PRIMARY KEY, orderId TEXT, requestId TEXT, question TEXT, response TEXT, sources TEXT, model TEXT, latencyMs INTEGER, success INTEGER, timestamp TEXT, error TEXT);
  CREATE UNIQUE INDEX IF NOT EXISTS one_refund_per_order ON audits(orderId) WHERE kind='initiate_refund';`);

  if (!(connection.prepare('SELECT count(*) as n FROM orders').get() as { n: number }).n) {
    seed(connection);
  }
  return connection;
}

export function seed(c: DatabaseSync = db()) {
  c.exec('BEGIN IMMEDIATE');
  try {
    for (const o of orders) {
      c.prepare('INSERT OR IGNORE INTO orders VALUES(?,?,?)').run(o.id, o.accountId, JSON.stringify(o));
      c.prepare('INSERT OR IGNORE INTO refunds VALUES(?,?,?,?)').run(
        o.id,
        o.id === 'PP-1043' ? 'initiated' : 'not_initiated',
        o.id === 'PP-1043' ? 'ACT-SEED-1043' : null,
        '2026-10-01T11:30:00.000Z'
      );
    }
    for (const s of sources) {
      c.prepare('INSERT OR IGNORE INTO sources VALUES(?,?,?,?,?)').run(s.id, s.accountId, s.orderId, s.type, JSON.stringify(s));
    }
    c.prepare('INSERT OR IGNORE INTO audits VALUES(?,?,?,?,?,?,?)').run(
      'ACT-SEED-1043',
      'PP-1043',
      'Maya Chen',
      'initiate_refund',
      '2026-09-30T12:00:00.000Z',
      'Simulated refund initiation recorded. No money moved.',
      'seed-1043'
    );
    c.exec('COMMIT');
  } catch (e) {
    c.exec('ROLLBACK');
    throw e;
  }
}

export function listOrders(): Order[] { 
  return db().prepare('SELECT data FROM orders ORDER BY id').all().map(r => JSON.parse(r.data as string)); 
}

export function getOrder(id: string): Order {
  const row = db().prepare('SELECT data FROM orders WHERE id=?').get(id);
  if (!row) throw new Error('Order not found: ' + id);
  return JSON.parse(row.data as string);
}

export function getRefund(id: string): Refund { 
  getOrder(id); 
  return db().prepare('SELECT * FROM refunds WHERE orderId=?').get(id) as Refund; 
}

export function orderSources(o: Order): Source[] {
  return db().prepare('SELECT data FROM sources WHERE accountId=? AND orderId=? ORDER BY id').all(o.accountId, o.id).map(r => JSON.parse(r.data as string));
}

export function accountSources(o: Order): Source[] {
  return db().prepare("SELECT data FROM sources WHERE accountId=? AND orderId IS NULL AND type='account'").all(o.accountId).map(r => JSON.parse(r.data as string));
}

export function policies(o: Order): Source[] {
  return db().prepare("SELECT data FROM sources WHERE type='policy'").all()
    .map(r => JSON.parse(r.data as string) as Source)
    .filter(s => s.region === o.region && s.effectiveFrom! <= now() && (!s.effectiveTo || now() < s.effectiveTo));
}

export function structuredSources(o: Order): Source[] {
  const f = getRefund(o.id);
  const base = { accountId: o.accountId, orderId: o.id, version: null, effectiveFrom: null, effectiveTo: null, region: null, photo: null };
  return [
    { ...base, id: `ORDER-${o.id}`, type: 'order', title: 'Verified order record · SQLite', timestamp: now(), text: JSON.stringify(o) },
    { ...base, id: `REF-${o.id}`, type: 'refund', title: 'Refund ledger · SQLite', timestamp: f.updatedAt, text: JSON.stringify(f) },
    ...getAudits(o.id).map(a => ({ ...base, id: a.id, type: 'action', title: 'Simulated action · audit trail', timestamp: a.at, text: JSON.stringify(a) }))
  ];
}

export function getAudits(id: string): Audit[] {
  return db().prepare('SELECT * FROM audits WHERE orderId=? ORDER BY at,id').all(id) as Audit[];
}

export function getAnalysis(id: string): Analysis | null { 
  const row = db().prepare('SELECT data FROM analyses WHERE orderId=?').get(id); 
  return row ? JSON.parse(row.data as string) : null; 
}

export function saveAnalysis(id: string, a: Analysis) {
  db().prepare('INSERT INTO analyses VALUES(?,?) ON CONFLICT(orderId) DO UPDATE SET data=excluded.data').run(id, JSON.stringify(a));
}

export function getCommitments(orderId: string): Commitment[] {
  const rows = db().prepare('SELECT data FROM commitments WHERE orderId=?').all(orderId);
  if (rows.length > 0) {
    return rows.map(r => JSON.parse(r.data as string));
  }
  // If not seeded in table yet, extract deterministically from order sources
  const order = getOrder(orderId);
  const ss = orderSources(order);
  const refund = getRefund(orderId);
  const list: Commitment[] = [];
  for (const s of ss.filter(x => x.type === 'support')) {
    if (s.text.includes('Your refund will be initiated within 24 hours.')) {
      const isFulfilled = refund.status === 'initiated';
      const deadline = new Date(Date.parse(s.timestamp) + 86400000).toISOString();
      const isOverdue = !isFulfilled && Date.parse(deadline) < Date.parse(now());
      list.push({
        id: `COMM-${s.id}-01`,
        caseId: orderId,
        type: 'REFUND',
        statement: 'Your refund will be initiated within 24 hours.',
        promisedBy: s.text.includes('Agent Maya Chen') ? 'Maya Chen' : 'Customer Support Agent',
        promisedAt: s.timestamp,
        deadline,
        status: isFulfilled ? 'COMPLETED' : (isOverdue ? 'OVERDUE' : 'PROMISED'),
        sourceId: s.id,
        verified: true,
        actionRecord: isFulfilled ? refund.actionId : null
      });
    }
  }
  return list;
}

export function saveCommitments(orderId: string, commitments: Commitment[]) {
  const c = db();
  c.exec('BEGIN IMMEDIATE');
  try {
    c.prepare('DELETE FROM commitments WHERE orderId=?').run(orderId);
    for (const item of commitments) {
      c.prepare('INSERT INTO commitments VALUES(?,?,?)').run(item.id, orderId, JSON.stringify(item));
    }
    c.exec('COMMIT');
  } catch (e) {
    c.exec('ROLLBACK');
    throw e;
  }
}

export function getRiskSignals(order: Order, refund: Refund, commitments: Commitment[], ss: Source[]): RiskSignal[] {
  const risks: RiskSignal[] = [];
  const overdueCommitment = commitments.find(c => c.status === 'OVERDUE');
  if (overdueCommitment) {
    risks.push({
      id: 'RISK-OVERDUE-PROMISE',
      level: 'high',
      title: 'Commitment Deadline Exceeded',
      detail: `Agent ${overdueCommitment.promisedBy} promised refund initiation within 24h. Deadline passed with no initiation recorded.`,
      sourceIds: [overdueCommitment.sourceId, `REF-${order.id}`]
    });
  } else if (commitments.length > 0 && commitments.some(c => c.status === 'PROMISED' || c.status === 'PENDING')) {
    risks.push({
      id: 'RISK-ACTIVE-PROMISE',
      level: 'medium',
      title: 'Previous Refund Commitment',
      detail: `A prior support agent made an explicit refund commitment on ${commitments[0].promisedAt}.`,
      sourceIds: commitments.map(c => c.sourceId)
    });
  }

  const supportSources = ss.filter(s => s.type === 'support');
  if (supportSources.length > 1 || supportSources.some(s => /third time|again|multiple times/i.test(s.text))) {
    risks.push({
      id: 'RISK-REPEATED-CONTACT',
      level: 'high',
      title: 'Customer Contacted Support Multiple Times',
      detail: 'Customer has contacted support multiple times across shifts explaining unresolved delivery.',
      sourceIds: supportSources.map(s => s.id)
    });
  }

  // Dynamic detection of courier vs customer conflicts across all cases
  const courierNotes = ss.filter(s => s.type === 'courier');
  const supportMsgs = ss.filter(s => s.type === 'support');
  const hasLocationConflict = courierNotes.some(c => /reception|door|mailroom|porch/i.test(c.text)) &&
    supportMsgs.some(s => /no reception|not my doorway|photo is not|wrong door|never received/i.test(s.text));

  if (hasLocationConflict) {
    const courierSrc = courierNotes.find(c => /reception|door|mailroom|porch/i.test(c.text)) || courierNotes[0];
    const supportSrc = supportMsgs.find(s => /no reception|not my doorway|photo is not|wrong door|never received/i.test(s.text)) || supportMsgs[0];
    risks.push({
      id: 'RISK-CONFLICTING-EVIDENCE',
      level: 'high',
      title: 'Courier / Customer Evidence Conflict',
      detail: 'Courier note conflicts with customer reported physical delivery location or photo.',
      sourceIds: [courierSrc?.id, supportSrc?.id].filter(Boolean) as string[]
    });
  }

  // Dynamic shared household detection
  if (order.speaker !== order.recipient || !order.verified) {
    risks.push({
      id: 'RISK-HOUSEHOLD-AUTHORITY',
      level: 'medium',
      title: 'Shared Household Identity Unresolved',
      detail: `Current speaker (${order.speaker}) is not verified recipient (${order.recipient}) for this order.`,
      sourceIds: supportMsgs.map(s => s.id).concat([`ORDER-${order.id}`])
    });
  }

  // Dynamic missing delivery record or missing policy detection
  if (!order.deliveredAt || courierNotes.length === 0 || policies(order).length === 0) {
    risks.push({
      id: 'RISK-MISSING-DELIVERY-RECORD',
      level: 'high',
      title: 'Missing Courier Scan or Policy Catalog Record',
      detail: 'No carrier delivery scan or applicable regional dispute policy found.',
      sourceIds: [`ORDER-${order.id}`]
    });
  }

  return risks;
}

export function getCaseMemory(orderId: string): CaseMemory | null {
  const row = db().prepare('SELECT data FROM case_memories WHERE orderId=?').get(orderId);
  if (row) {
    return JSON.parse(row.data as string);
  }
  // Build and save initial case memory
  const order = getOrder(orderId);
  const refund = getRefund(orderId);
  const ss = orderSources(order);
  const comms = getCommitments(orderId);
  const risks = getRiskSignals(order, refund, comms, ss);

  const speakerDistinction = (order.speaker === order.recipient)
    ? 'CURRENT_SPEAKER'
    : (order.accountId === 'HH-208' ? 'OTHER_HOUSEHOLD_MEMBER' : 'UNKNOWN_ATTRIBUTION');

  const verifiedFacts = [
    {
      id: `FACT-ORD-${orderId}`,
      type: 'fact' as const,
      content: `Order ${orderId} placed for ${order.item} (${order.currency} ${order.amount}). Intended recipient: ${order.recipient}.`,
      sourceId: `ORDER-${orderId}`,
      sourceType: 'order',
      timestamp: now(),
      confidence: 1.0,
      verificationStatus: 'VERIFIED' as const
    },
    {
      id: `FACT-REF-${orderId}`,
      type: 'fact' as const,
      content: refund.status === 'initiated' ? `Refund initiation recorded (action: ${refund.actionId}).` : 'No refund initiation recorded in structured ledger.',
      sourceId: `REF-${orderId}`,
      sourceType: 'refund',
      timestamp: refund.updatedAt,
      confidence: 1.0,
      verificationStatus: 'VERIFIED' as const
    }
  ];

  if (order.deliveredAt) {
    verifiedFacts.push({
      id: `FACT-DEL-${orderId}`,
      type: 'fact' as const,
      content: `Delivery system records carrier scan status as ${order.status} on ${order.deliveredAt}.`,
      sourceId: `ORDER-${orderId}`,
      sourceType: 'order',
      timestamp: order.deliveredAt,
      confidence: 1.0,
      verificationStatus: 'VERIFIED' as const
    });
  }

  const customerClaims = ss.filter(s => s.type === 'support').map(s => ({
    id: `CLAIM-CUST-${s.id}`,
    type: 'customer_claim' as const,
    content: s.text,
    sourceId: s.id,
    sourceType: 'support',
    timestamp: s.timestamp,
    confidence: 0.85,
    verificationStatus: 'CLAIM' as const
  }));

  const courierClaims = ss.filter(s => s.type === 'courier').map(s => ({
    id: `CLAIM-COUR-${s.id}`,
    type: 'courier_claim' as const,
    content: s.text,
    sourceId: s.id,
    sourceType: 'courier',
    timestamp: s.timestamp,
    confidence: 0.85,
    verificationStatus: 'CLAIM' as const
  }));

  const courierSrcs = ss.filter(s => s.type === 'courier');
  const supportSourcesList = ss.filter(s => s.type === 'support');
  const hasConflict = courierSrcs.some(c => /reception|door|mailroom|porch/i.test(c.text)) &&
    supportSourcesList.some(s => /no reception|not my doorway|photo is not|wrong door|never received/i.test(s.text));

  const conflicts = hasConflict ? [
    {
      id: `CONF-${orderId}`,
      type: 'conflict' as const,
      content: 'Courier claims package was delivered to reception/doorway, whereas Customer reports location mismatch and disputes evidence photo.',
      sourceId: courierSrcs[0]?.id || `ORDER-${orderId}`,
      sourceType: 'conflict',
      timestamp: now(),
      confidence: 0.95,
      verificationStatus: 'CONFLICT' as const
    }
  ] : [];

  const missing: CaseMemoryItem[] = [];
  if (!order.deliveredAt || courierSrcs.length === 0) {
    missing.push({
      id: `MISS-${orderId}-1`,
      type: 'missing_evidence' as const,
      content: 'Missing carrier delivery scan and courier tracking record.',
      sourceId: `ORDER-${orderId}`,
      sourceType: 'missing',
      timestamp: now(),
      confidence: 1.0,
      verificationStatus: 'MISSING' as const
    });
  }
  if (policies(order).length === 0) {
    missing.push({
      id: `MISS-${orderId}-2`,
      type: 'missing_evidence' as const,
      content: `No applicable delivery dispute policy in catalog for region ${order.region}.`,
      sourceId: `ORDER-${orderId}`,
      sourceType: 'missing',
      timestamp: now(),
      confidence: 1.0,
      verificationStatus: 'MISSING' as const
    });
  }

  const memory: CaseMemory = {
    caseId: orderId,
    customerId: order.accountId,
    orderId,
    intendedRecipient: order.recipient,
    currentSpeaker: order.speaker,
    speakerDistinction,
    verifiedFacts,
    customerClaims,
    courierClaims,
    previousCommitments: comms,
    refundStatus: refund.status,
    policyReferences: policies(order).map(p => ({
      id: p.id,
      type: 'policy_rule' as const,
      content: p.text,
      sourceId: p.id,
      sourceType: 'policy',
      timestamp: p.timestamp,
      confidence: 1.0,
      verificationStatus: 'VERIFIED' as const
    })),
    unresolvedConflicts: conflicts,
    missingEvidence: missing,
    previousActions: getAudits(orderId).map(a => ({
      id: a.id,
      type: 'action_event' as const,
      content: a.detail,
      sourceId: a.id,
      sourceType: 'action',
      timestamp: a.at,
      confidence: 1.0,
      verificationStatus: 'VERIFIED' as const
    })),
    pendingActions: [],
    importantTimelineEvents: [],
    riskSignals: risks,
    lastAnalyzedAt: now(),
    lastUpdatedBy: 'System',
    confidence: 0.95,
    sourceReferences: [...ss.map(s => s.id), `ORDER-${orderId}`, `REF-${orderId}`]
  };

  saveCaseMemory(orderId, memory);
  return memory;
}

export function saveCaseMemory(orderId: string, memory: CaseMemory) {
  db().prepare('INSERT INTO case_memories VALUES(?,?,?) ON CONFLICT(orderId) DO UPDATE SET data=excluded.data, updatedAt=excluded.updatedAt')
    .run(orderId, JSON.stringify(memory), new Date().toISOString());
}

export function getAIConversation(orderId: string): AIChatMessage[] {
  const row = db().prepare('SELECT data FROM ai_conversations WHERE orderId=?').get(orderId);
  return row ? JSON.parse(row.data as string) : [];
}

export function saveAIConversation(orderId: string, messages: AIChatMessage[]) {
  db().prepare('INSERT INTO ai_conversations VALUES(?,?) ON CONFLICT(orderId) DO UPDATE SET data=excluded.data')
    .run(orderId, JSON.stringify(messages));
}

export function addAIChatMessage(orderId: string, message: AIChatMessage) {
  const existing = getAIConversation(orderId);
  existing.push(message);
  saveAIConversation(orderId, existing);
}

export function getNextAgentBrief(orderId: string): NextAgentBrief | null {
  const row = db().prepare('SELECT data FROM next_agent_briefs WHERE orderId=?').get(orderId);
  if (row) return JSON.parse(row.data as string);
  
  // Deterministic brief generation if none saved yet
  const order = getOrder(orderId);
  const refund = getRefund(orderId);
  const comms = getCommitments(orderId);
  const promise = comms[0];
  
  const verifiedInfo = [
    `Order ${orderId} (${order.item}) exists for account ${order.accountId}.`,
    `Intended recipient: ${order.recipient} (${order.verified ? 'Verified identity' : 'Authorization pending'}).`,
    `Delivery status: ${order.status}.`,
    refund.status === 'initiated' ? `Refund ledger: Initiation recorded (Action ${refund.actionId}).` : 'Refund ledger: No initiation recorded.'
  ];

  const courierSrcs = orderSources(order).filter(s => s.type === 'courier');
  const supportSrcs = orderSources(order).filter(s => s.type === 'support');
  const hasConflict = courierSrcs.some(c => /reception|door|mailroom|porch/i.test(c.text)) &&
    supportSrcs.some(s => /no reception|not my doorway|photo is not|wrong door|never received/i.test(s.text));

  let nextAction = 'Review evidence and apply policy.';
  if (refund.status === 'initiated') {
    nextAction = 'Status review of existing refund initiation. Avoid duplicate refund.';
  } else if (order.speaker !== order.recipient || !order.verified) {
    nextAction = `Verify recipient authorization with account holder ${order.recipient} before proceeding.`;
  } else if (!order.deliveredAt || policies(order).length === 0) {
    nextAction = 'Escalate to Dispute Review due to missing courier scan or missing regional policy.';
  } else {
    nextAction = 'Verify dispute policy prerequisites and obtain human agent approval before simulated refund.';
  }

  const brief: NextAgentBrief = {
    caseId: orderId,
    customerIssue: `Customer disputes non-receipt of ${order.item} (${order.currency} ${order.amount}).`,
    verifiedInformation: verifiedInfo,
    previousCommitment: promise 
      ? `Refund promised within 24h by ${promise.promisedBy} (Source: ${promise.sourceId}). Status: ${promise.status}.`
      : 'No previous refund commitment recorded.',
    unresolvedConflict: hasConflict
      ? 'Courier reports package left at reception/doorway; Customer states building has no reception and disputes photo.'
      : 'No conflicting physical evidence statements recorded.',
    nextAction,
    generatedAt: now(),
    agent: 'System / ParcelProof AI',
    sourceIds: [`ORDER-${orderId}`, `REF-${orderId}`, ...(promise ? [promise.sourceId] : [])]
  };

  saveNextAgentBrief(orderId, brief);
  return brief;
}

export function saveNextAgentBrief(orderId: string, brief: NextAgentBrief) {
  db().prepare('INSERT INTO next_agent_briefs VALUES(?,?) ON CONFLICT(orderId) DO UPDATE SET data=excluded.data')
    .run(orderId, JSON.stringify(brief));
}

export function logAIAudit(audit: { 
  caseId: string; 
  requestId: string; 
  question: string; 
  response: string; 
  sources: string[]; 
  model: string; 
  latencyMs: number; 
  success: boolean; 
  timestamp: string; 
  error?: string 
}) {
  db().prepare('INSERT INTO ai_audits VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(
    randomUUID(),
    audit.caseId,
    audit.requestId,
    audit.question,
    audit.response,
    JSON.stringify(audit.sources),
    audit.model,
    audit.latencyMs,
    audit.success ? 1 : 0,
    audit.timestamp,
    audit.error || null
  );
}

export function getCase(id: string): CaseData {
  const order = getOrder(id);
  const refund = getRefund(id);
  const h = db().prepare('SELECT data FROM handoffs WHERE orderId=?').get(id);
  const d = db().prepare('SELECT text FROM drafts WHERE orderId=?').get(id);
  const s = db().prepare('SELECT agent FROM sessions WHERE orderId=?').get(id);
  const activeAgent = (s?.agent as string) || 'Priya Shah';
  
  const memory = getCaseMemory(id);
  const commitments = getCommitments(id);
  const orderSrcs = orderSources(order);
  const riskSignals = getRiskSignals(order, refund, commitments, orderSrcs);
  const chatHistory = getAIConversation(id);
  const brief = getNextAgentBrief(id);

  return {
    order,
    refund,
    sources: [...orderSrcs, ...policies(order), ...structuredSources(order)],
    accountContext: accountSources(order),
    audits: getAudits(id),
    analysis: getAnalysis(id),
    handoff: h ? JSON.parse(h.data as string) : null,
    brief,
    memory,
    commitments,
    riskSignals,
    chatHistory,
    draft: (d?.text as string) || '',
    activeAgent,
    mode: mode(),
    now: now()
  };
}

export function listOrdersForAccount(accountId: string): Order[] {
  return db().prepare('SELECT data FROM orders WHERE accountId=? ORDER BY id').all(accountId).map(r => JSON.parse(r.data as string));
}

export function createCustomerDispute(
  accountId: string, 
  speaker: string, 
  submission: { orderId?: string; item?: string; amount?: number; currency?: string; category: string; description: string; photoUrl?: string | null }
): Order {
  const c = db();
  c.exec('BEGIN IMMEDIATE');
  try {
    let order: Order;
    let orderId = submission.orderId;
    if (orderId) {
      try {
        order = getOrder(orderId);
        order.status = 'Delivered · disputed';
        c.prepare('UPDATE orders SET data=? WHERE id=?').run(JSON.stringify(order), orderId);
      } catch {
        // Create new order record
        order = {
          id: orderId,
          accountId,
          label: 'Customer reported dispute',
          item: submission.item || 'Disputed Item',
          amount: submission.amount || 99,
          currency: submission.currency || 'USD',
          speaker,
          recipient: speaker,
          verified: true,
          region: 'US',
          deliveredAt: new Date(Date.now() - 86400000).toISOString(),
          status: 'Delivered · disputed'
        };
        c.prepare('INSERT INTO orders VALUES(?,?,?)').run(order.id, accountId, JSON.stringify(order));
        c.prepare('INSERT OR IGNORE INTO refunds VALUES(?,?,?,?)').run(order.id, 'not_initiated', null, new Date().toISOString());
      }
    } else {
      orderId = `PP-${Math.floor(1000 + Math.random() * 9000)}`;
      order = {
        id: orderId,
        accountId,
        label: 'Customer reported dispute',
        item: submission.item || 'Online Purchase',
        amount: submission.amount || 79,
        currency: submission.currency || 'USD',
        speaker,
        recipient: speaker,
        verified: true,
        region: 'US',
        deliveredAt: new Date(Date.now() - 86400000).toISOString(),
        status: 'Delivered · disputed'
      };
      c.prepare('INSERT INTO orders VALUES(?,?,?)').run(order.id, accountId, JSON.stringify(order));
      c.prepare('INSERT OR IGNORE INTO refunds VALUES(?,?,?,?)').run(order.id, 'not_initiated', null, new Date().toISOString());
    }

    const sourceId = `SUP-${order.id}-0${Math.floor(Math.random() * 90 + 10)}`;
    const sourceData: Source = {
      id: sourceId,
      accountId,
      orderId: order.id,
      type: 'support',
      title: `Customer Dispute Report: ${submission.category.replaceAll('_', ' ')}`,
      timestamp: new Date().toISOString(),
      text: `Customer ${speaker}: [Dispute Category: ${submission.category}] ${submission.description}`,
      version: null,
      effectiveFrom: null,
      effectiveTo: null,
      region: 'US',
      photo: submission.photoUrl || null
    };
    c.prepare('INSERT INTO sources VALUES(?,?,?,?,?)').run(sourceId, accountId, order.id, 'support', JSON.stringify(sourceData));

    // Clear stale analysis to trigger fresh RAG reconciliation
    c.prepare('DELETE FROM analyses WHERE orderId=?').run(order.id);
    c.prepare('DELETE FROM case_memories WHERE orderId=?').run(order.id);
    c.prepare('DELETE FROM next_agent_briefs WHERE orderId=?').run(order.id);

    c.exec('COMMIT');
    return order;
  } catch (e) {
    c.exec('ROLLBACK');
    throw e;
  }
}

export function addCustomerMessage(orderId: string, speaker: string, message: string): Source {
  const order = getOrder(orderId);
  const sourceId = `SUP-${orderId}-MSG-${Date.now().toString().slice(-4)}`;
  const sourceData: Source = {
    id: sourceId,
    accountId: order.accountId,
    orderId,
    type: 'support',
    title: `Customer update from ${speaker}`,
    timestamp: new Date().toISOString(),
    text: `Customer ${speaker}: ${message}`,
    version: null,
    effectiveFrom: null,
    effectiveTo: null,
    region: order.region,
    photo: null
  };

  db().prepare('INSERT INTO sources VALUES(?,?,?,?,?)').run(
    sourceId,
    order.accountId,
    orderId,
    'support',
    JSON.stringify(sourceData)
  );

  // Invalidate stale memory to incorporate new message
  db().prepare('DELETE FROM case_memories WHERE orderId=?').run(orderId);
  return sourceData;
}

export function getAdminOverview() {
  const allOrders = listOrders();
  let overdueCommitments = 0;
  let activeDisputes = 0;
  let evidenceConflicts = 0;
  let initiatedRefunds = 0;

  for (const o of allOrders) {
    if (o.status.includes('disputed') || o.status.includes('unconfirmed')) {
      activeDisputes++;
    }
    const comms = getCommitments(o.id);
    if (comms.some(c => c.status === 'OVERDUE')) {
      overdueCommitments++;
    }
    const refund = getRefund(o.id);
    if (refund.status === 'initiated') {
      initiatedRefunds++;
    }
    const oSrcs = orderSources(o);
    const cSrcs = oSrcs.filter(s => s.type === 'courier');
    const sSrcs = oSrcs.filter(s => s.type === 'support');
    if (cSrcs.some(c => /reception|door|mailroom/i.test(c.text)) && sSrcs.some(s => /no reception|not my doorway|photo is not|wrong door/i.test(s.text))) {
      evidenceConflicts++;
    }
  }

  const allAudits = db().prepare('SELECT * FROM audits ORDER BY at DESC LIMIT 20').all() as Audit[];
  const aiAudits = db().prepare('SELECT * FROM ai_audits ORDER BY timestamp DESC LIMIT 20').all();

  return {
    totalOrders: allOrders.length,
    activeDisputes,
    overdueCommitments,
    evidenceConflicts,
    initiatedRefunds,
    recentAudits: allAudits,
    recentAIAudits: aiAudits
  };
}

export function listAllPolicies(): Source[] {
  return db().prepare("SELECT data FROM sources WHERE type='policy' ORDER BY id DESC").all().map(r => JSON.parse(r.data as string) as Source);
}

export function getAgentWorkloads() {
  const agents = [
    { id: 'USR-AGENT-01', name: 'Priya Shah', email: 'priya@parcelproof.com', status: 'Online' },
    { id: 'USR-AGENT-02', name: 'Daniel Kim', email: 'daniel@parcelproof.com', status: 'In Shift' },
    { id: 'USR-AGENT-03', name: 'Maya Chen', email: 'maya@parcelproof.com', status: 'Offline' }
  ];

  const sessions = db().prepare('SELECT * FROM sessions').all() as { orderId: string; agent: string }[];
  const allOrders = listOrders();

  return agents.map(ag => {
    const assignedOrderIds = sessions.filter(s => s.agent === ag.name || s.agent === ag.email).map(s => s.orderId);
    const activeCases = assignedOrderIds.length > 0 ? assignedOrderIds.length : (ag.name === 'Daniel Kim' ? 2 : (ag.name === 'Priya Shah' ? 2 : 0));
    const resolvedCases = ag.name === 'Maya Chen' ? 4 : (ag.name === 'Priya Shah' ? 3 : 1);

    return {
      ...ag,
      activeCases,
      resolvedCases,
      assignedCases: assignedOrderIds
    };
  });
}

export function assignAgentToCase(orderId: string, agentName: string) {
  getOrder(orderId);
  db().prepare('INSERT OR REPLACE INTO sessions VALUES(?,?)').run(orderId, agentName);
  return { success: true, orderId, agentName };
}



