import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { assignDeliveryAgent } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

const assignSchema = z.object({
  deliveryAgentId: z.string().optional(),
  agentId: z.string().optional(),
  assignedBy: z.string().optional()
});

export async function POST(req: Request, ctx: Context) {
  try {
    const user = await getCurrentUser();
    if (user && user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return Response.json({ error: 'Unauthorized: Operations owner or admin role required' }, { status: 403 });
    }

    const id = (await ctx.params).id;
    const body = assignSchema.parse(await req.json());
    const assignedBy = body.assignedBy || user?.name || 'Operations Owner';

    const agentId = body.deliveryAgentId || body.agentId || '';
    const order = assignDeliveryAgent(id, agentId, assignedBy);

    return Response.json({ success: true, order });
  } catch (e) {
    const isZod = e instanceof z.ZodError;
    return Response.json(
      { error: isZod ? 'Invalid assignment payload' : e instanceof Error ? e.message : 'Assignment failed' },
      { status: 400 }
    );
  }
}
