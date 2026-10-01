import { getCurrentUser } from '@/lib/auth';
import { listOrdersForAccount } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'CUSTOMER' || !user.accountId) {
    return Response.json({ error: 'Unauthorized customer access' }, { status: 401 });
  }

  const orders = listOrdersForAccount(user.accountId);
  return Response.json({ orders });
}
