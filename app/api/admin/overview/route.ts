import { getCurrentUser } from '@/lib/auth';
import { getAdminOverview, listOrders, listAllPolicies, getAgentWorkloads } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ error: 'Admin authorization required' }, { status: 403 });
  }

  const overview = getAdminOverview();
  const allOrders = listOrders();
  const allPolicies = listAllPolicies();
  const agents = getAgentWorkloads();

  return Response.json({
    ...overview,
    orders: allOrders,
    policies: allPolicies,
    agents
  });
}

