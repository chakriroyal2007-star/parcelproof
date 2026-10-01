import { listOrders, mode, now } from '@/lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){return Response.json({orders:listOrders(),mode:mode(),now:now()});}
