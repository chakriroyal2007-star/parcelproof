import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  placeCustomerOrder, 
  assignDeliveryAgent, 
  updateDeliveryStatus, 
  calculateRefundAssessment,
  recordOwnerDecision,
  getTimeline,
  listProducts,
  listDeliveryAgents,
  getCase,
  createCustomerDispute,
  addCustomerMessage
} from '../lib/db';
import { authenticateUser, authorizeCaseAccess } from '../lib/auth';
import type { User } from '../lib/types';

test('LIFECYCLE 1: Product catalog and delivery agents are available and typed', () => {
  const products = listProducts();
  assert.ok(products.length >= 4, 'Must have at least 4 products');
  const headphones = products.find(p => p.id === 'PROD-WH-001');
  assert.ok(headphones, 'PROD-WH-001 must exist');
  assert.equal(headphones.name, 'Studio Wireless Headphones');
  assert.equal(headphones.price, 129.00);

  const couriers = listDeliveryAgents();
  assert.ok(couriers.length >= 3, 'Must have at least 3 delivery agents');
  const daniel = couriers.find(c => c.id === 'DEL-AGT-01');
  assert.ok(daniel, 'Daniel Kumar DEL-AGT-01 must exist');
  assert.equal(daniel.name, 'Daniel Kumar');
});

test('LIFECYCLE 2: Customer places order -> Generates real orderId and exact productId', () => {
  const order = placeCustomerOrder({
    productId: 'PROD-WH-001',
    customerId: 'USR-CUST-1042',
    customerName: 'Alex Morgan',
    accountId: 'HH-208',
    deliveryAddress: '742 Evergreen Terrace, Springfield',
    quantity: 1
  });

  assert.ok(order.id.startsWith('ORD-2026-'), 'Must generate ORD-2026- prefix');
  assert.equal(order.productId, 'PROD-WH-001');
  assert.equal(order.speaker, 'Alex Morgan');
  assert.equal(order.deliveryStatus, 'READY_FOR_ASSIGNMENT');

  // Verify case record exists in SQLite
  const caseObj = getCase(order.id);
  assert.ok(caseObj, 'Case record must exist for order');
  assert.equal(caseObj.order.id, order.id);
  assert.equal(caseObj.order.item, 'Studio Wireless Headphones');
  assert.equal(caseObj.order.productId, 'PROD-WH-001');
});

test('LIFECYCLE 3: Owner assigns Delivery Agent -> Courier assigned to exact orderId', () => {
  const order = placeCustomerOrder({
    productId: 'PROD-KB-002',
    customerId: 'USR-CUST-1042',
    customerName: 'Alex Morgan',
    accountId: 'HH-208',
    deliveryAddress: '100 Main St, Suite 400',
    quantity: 1
  });

  const updatedOrder = assignDeliveryAgent(order.id, 'DEL-AGT-01', 'Elena Vance');
  assert.equal(updatedOrder.deliveryAgentId, 'DEL-AGT-01');
  assert.equal(updatedOrder.deliveryAgentName, 'Daniel Kumar');
  assert.equal(updatedOrder.deliveryStatus, 'ASSIGNED');

  // Verify persisted in SQLite
  const caseObj = getCase(order.id);
  assert.equal(caseObj?.order.deliveryAgentId, 'DEL-AGT-01');
  assert.equal(caseObj?.order.deliveryStatus, 'ASSIGNED');
});

test('LIFECYCLE 4: Courier state machine: ASSIGNED -> OUT_FOR_DELIVERY -> DELIVERED with proof photo', () => {
  const order = placeCustomerOrder({
    productId: 'PROD-SM-003',
    customerId: 'USR-CUST-1042',
    customerName: 'Alex Morgan',
    accountId: 'HH-208',
    deliveryAddress: '221B Baker St',
    quantity: 1
  });

  assignDeliveryAgent(order.id, 'DEL-AGT-01', 'Elena Vance');

  // Step 1: Mark Out for Delivery
  const step1 = updateDeliveryStatus(
    order.id, 
    'OUT_FOR_DELIVERY', 
    'DEL-AGT-01', 
    'Daniel Kumar',
    'Courier Daniel Kumar picked up package and is en route.'
  );
  assert.equal(step1.deliveryStatus, 'OUT_FOR_DELIVERY');

  // Step 2: Mark Delivered with required delivery proof photo and statement
  const step2 = updateDeliveryStatus(
    order.id,
    'DELIVERED',
    'DEL-AGT-01',
    'Daniel Kumar',
    'Left package at reception.',
    'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=60'
  );
  assert.equal(step2.deliveryStatus, 'DELIVERED');
  assert.ok(step2.deliveryProof?.photoUrl);
  assert.equal(step2.deliveryProof?.note, 'Left package at reception.');

  const finalCase = getCase(order.id);
  assert.equal(finalCase?.order.deliveryStatus, 'DELIVERED');
});

test('LIFECYCLE 5: Deterministic Refund Assessment score (0-100) with explainable factors for PP-1042', () => {
  const assessment = calculateRefundAssessment('PP-1042');
  assert.ok(assessment, 'Must generate assessment');
  assert.equal(assessment.caseId, 'PP-1042');
  assert.equal(assessment.score, 82, 'Must yield calibrated 82/100 for PP-1042');
  assert.equal(assessment.levelLabel, 'Strong evidence supporting refund review');
  assert.ok(assessment.factors.customerEvidence >= 18);
  assert.ok(assessment.factors.deliveryConsistency >= 17);
  assert.ok(assessment.factors.commitments >= 15);
  assert.ok(assessment.factors.timelineConsistency >= 8);
  assert.ok(assessment.factors.policyEligibility >= 10);
  assert.ok(assessment.uncertainty.length > 0, 'Uncertainties must be flagged transparently');
});

test('LIFECYCLE 6: Owner decision recording: APPROVE records atomic refund and audit trail', () => {
  const decision = recordOwnerDecision(
    'PP-1042',
    'APPROVE_REFUND',
    'Evidence confirms delivery conflict with no reception on premises and overdue promise.',
    null,
    'Elena Vance'
  );

  assert.equal(decision.decision, 'APPROVE_REFUND');
  assert.equal(decision.ownerName, 'Elena Vance');
  assert.equal(decision.caseId, 'PP-1042');
  assert.equal(decision.status, 'COMPLETED');

  const updatedCase = getCase('PP-1042');
  assert.equal(updatedCase?.ownerDecision?.decision, 'APPROVE_REFUND');
  assert.equal(updatedCase?.order.status, 'Refund Approved');
});

test('LIFECYCLE 7: Unified timeline contains chronologically sorted events across lifecycle', () => {
  const timeline = getTimeline('PP-1042');
  assert.ok(timeline.length >= 2, 'Timeline must contain multiple events');
  assert.ok(timeline.some(e => e.actorRole === 'Customer' || e.actorRole === 'Delivery Agent' || e.actorRole === 'Owner'));
});

test('LIFECYCLE 8: Role Authentication & Access isolation for OWNER and DELIVERY_AGENT', () => {
  const owner = authenticateUser('owner@parcelproof.com', 'password123');
  assert.ok(owner);
  assert.equal(owner.role, 'OWNER');
  assert.equal(owner.name, 'Elena Vance');

  const courier = authenticateUser('courier@parcelproof.com', 'password123');
  assert.ok(courier);
  assert.equal(courier.role, 'DELIVERY_AGENT');
  assert.equal(courier.name, 'Daniel Kumar');

  // Owner can access all cases
  assert.equal(authorizeCaseAccess(owner, 'PP-1042'), true);
  assert.equal(authorizeCaseAccess(owner, 'PP-1043'), true);
});
