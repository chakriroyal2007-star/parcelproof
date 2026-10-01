import { db, listOrders } from '../lib/db';
db(); console.log(`Synthetic database ready: ${listOrders().length} demo cases. Existing work preserved.`);
