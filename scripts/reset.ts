import { db, resetDatabase } from '../lib/db';

db();
resetDatabase();
console.log('ParcelProof database successfully reset to clean state (catalog/policies preserved, orders/cases/disputes/users cleared).');
