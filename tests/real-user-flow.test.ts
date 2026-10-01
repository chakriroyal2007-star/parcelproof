import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  getOrCreateUserInDb, 
  getUserByEmailInDb, 
  listOrdersForAccount,
  placeCustomerOrder,
  getCase,
  assignDeliveryAgent,
  updateDeliveryStatus,
  createCustomerDispute,
  addCustomerMessage,
  calculateRefundAssessment,
  recordOwnerDecision,
  getTimeline,
  getOrder
} from '../lib/db';
import { authenticateUser, authorizeCaseAccess } from '../lib/auth';
import { answerCustomerQuestion } from '../lib/llm-service';
import type { User } from '../lib/types';

test('REAL USER FLOW 1: Dynamic user registration & session generation for any name & email', () => {
  const customerName = 'Chakradhar';
  const customerEmail = 'chakradhar@example.com';
  
  const user = authenticateUser(customerEmail, 'password123', customerName, 'CUSTOMER');
  assert.ok(user, 'User must be created dynamically');
  assert.equal(user.name, customerName);
  assert.equal(user.email, customerEmail);
  assert.equal(user.role, 'CUSTOMER');
  assert.ok(user.accountId, 'Must assign unique accountId');
  assert.ok(user.id.startsWith('USR-CUST-'), 'Must assign customer userId');

  // Verify persistence in SQLite
  const fetched = getUserByEmailInDb(customerEmail);
  assert.ok(fetched, 'User must persist in SQLite users table');
  assert.equal(fetched.name, customerName);
  assert.equal(fetched.accountId, user.accountId);
});

test('REAL USER FLOW 2: Fresh user has empty orders initially', () => {
  const newUser = authenticateUser('fresh.user@example.com', 'password123', 'Fresh User', 'CUSTOMER');
  assert.ok(newUser);
  assert.ok(newUser.accountId);

  const orders = listOrdersForAccount(newUser.accountId);
  assert.equal(orders.length, 0, 'Fresh customer must have 0 orders');
});

test('REAL USER FLOW 3: Dynamic customer places order from catalog', () => {
  const customer = authenticateUser('buyer@example.com', 'password123', 'John Buyer', 'CUSTOMER')!;
  assert.ok(customer && customer.accountId);

  const order = placeCustomerOrder({
    productId: 'PROD-HEADPHONES-001',
    customerId: customer.id,
    customerName: customer.name,
    accountId: customer.accountId,
    deliveryAddress: '555 Tech Hub Blvd, Suite 200, San Francisco, CA',
    quantity: 1
  });

  assert.ok(order.id.startsWith('ORD-2026-'));
  assert.equal(order.item, 'Studio Wireless Headphones');
  assert.equal(order.amount, 129.00);
  assert.equal(order.accountId, customer.accountId);

  // Verify retrieved by customer account
  const customerOrders = listOrdersForAccount(customer.accountId);
  assert.equal(customerOrders.length, 1);
  assert.equal(customerOrders[0].id, order.id);
});

test('REAL USER FLOW 4: Owner assigns single delivery agent to user-created order', () => {
  const customer = authenticateUser('buyer2@example.com', 'password123', 'Alice Buyer', 'CUSTOMER')!;
  const order = placeCustomerOrder({
    productId: 'PROD-KB-002',
    customerId: customer.id,
    customerName: customer.name,
    accountId: customer.accountId!,
    deliveryAddress: '123 Market St, San Francisco, CA',
    quantity: 1
  });

  const owner = authenticateUser('ops.lead@example.com', 'password123', 'Operations Lead', 'OWNER')!;
  assert.equal(owner.role, 'OWNER');

  // Owner assigns single courier
  const updatedOrder = assignDeliveryAgent(order.id, 'DEL-AGT-01', owner.name);
  assert.equal(updatedOrder.deliveryAgentId, 'DEL-AGT-01');
  assert.equal(updatedOrder.deliveryStatus, 'ASSIGNED');

  const caseObj = getCase(order.id);
  assert.equal(caseObj?.order.deliveryAgentId, 'DEL-AGT-01');
});

test('REAL USER FLOW 5: Delivery Agent completes lifecycle & uploads proof', () => {
  const customer = authenticateUser('buyer3@example.com', 'password123', 'Robert Buyer', 'CUSTOMER')!;
  const order = placeCustomerOrder({
    productId: 'PROD-SM-003',
    customerId: customer.id,
    customerName: customer.name,
    accountId: customer.accountId!,
    deliveryAddress: '789 Pine Ave, Seattle, WA',
    quantity: 1
  });

  assignDeliveryAgent(order.id, 'DEL-AGT-01', 'Elena Vance');

  // Courier transitions state
  updateDeliveryStatus(order.id, 'OUT_FOR_DELIVERY', 'DEL-AGT-01', 'Daniel Kumar', 'Picked up and out for delivery');
  const delivered = updateDeliveryStatus(
    order.id,
    'DELIVERED',
    'DEL-AGT-01',
    'Daniel Kumar',
    'Left at reception desk.',
    'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800'
  );

  assert.equal(delivered.deliveryStatus, 'DELIVERED');
  assert.equal(delivered.deliveryProof?.note, 'Left at reception desk.');
  assert.ok(delivered.deliveryProof?.photoUrl);
});

test('REAL USER FLOW 6: Customer disputes delivery & dynamic RAG captures evidence', async () => {
  const customer = authenticateUser('buyer4@example.com', 'password123', 'Diana Prince', 'CUSTOMER')!;
  const order = placeCustomerOrder({
    productId: 'PROD-HEADPHONES-001',
    customerId: customer.id,
    customerName: customer.name,
    accountId: customer.accountId!,
    deliveryAddress: '10 Downing St',
    quantity: 1
  });

  assignDeliveryAgent(order.id, 'DEL-AGT-01', 'Elena Vance');
  updateDeliveryStatus(order.id, 'DELIVERED', 'DEL-AGT-01', 'Daniel Kumar', 'Left at reception.');

  // Customer creates dispute
  createCustomerDispute(customer.accountId!, customer.name, {
    orderId: order.id,
    category: 'not_received',
    description: 'My building has no reception desk. I was home all day.'
  });

  // Customer adds new fact
  addCustomerMessage(order.id, customer.name, 'Building security checked cameras and confirmed no courier entered today.');

  // Query AI as customer
  const answer = await answerCustomerQuestion(order.id, 'What is the status of my dispute?', customer);
  assert.ok(answer.answer.length > 10, 'Must produce grounded answer');
  assert.ok(answer.caseStatus, 'Must report active case status');

  // Customer asks about security confirmation
  const answerSecurity = await answerCustomerQuestion(order.id, 'Did you record what building security told me?', customer);
  assert.ok(
    answerSecurity.answer.toLowerCase().includes('security') || answerSecurity.answer.toLowerCase().includes('building'),
    'Must retrieve dynamically indexed customer statement'
  );
});

test('REAL USER FLOW 7: Cross-User Isolation prevents Customer B from accessing Customer A', () => {
  const userA = authenticateUser('userA@example.com', 'password123', 'User Alpha', 'CUSTOMER')!;
  const userB = authenticateUser('userB@example.com', 'password123', 'User Beta', 'CUSTOMER')!;

  const orderA = placeCustomerOrder({
    productId: 'PROD-HEADPHONES-001',
    customerId: userA.id,
    customerName: userA.name,
    accountId: userA.accountId!,
    deliveryAddress: 'Alpha Street 1',
    quantity: 1
  });

  // User A can access Order A
  assert.equal(authorizeCaseAccess(userA, orderA.id), true);

  // User B cannot access Order A
  assert.equal(authorizeCaseAccess(userB, orderA.id), false);

  // User B's orders do not contain Order A
  const userBOrders = listOrdersForAccount(userB.accountId!);
  assert.equal(userBOrders.some(o => o.id === orderA.id), false);
});
