import { getCurrentUser } from '@/lib/auth';
import { assignAgentToCase } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ error: 'Admin authorization required' }, { status: 403 });
  }

  const { orderId, agentName } = await req.json();
  if (!orderId || !agentName) {
    return Response.json({ error: 'orderId and agentName required' }, { status: 400 });
  }

  try {
    const res = assignAgentToCase(orderId, agentName);
    return Response.json(res);
  } catch (err: any) {
    return Response.json({ error: err.message || 'Failed to assign agent' }, { status: 500 });
  }
}
