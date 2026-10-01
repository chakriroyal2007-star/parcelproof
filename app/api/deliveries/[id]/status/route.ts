import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { updateDeliveryStatus } from '@/lib/db';
import type { DeliveryStatus } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

const statusSchema = z.object({
  status: z.enum(['READY_FOR_ASSIGNMENT', 'ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED', 'DELIVERED', 'FAILED', 'DISPUTED', 'DELIVERY_CONFIRMED']),
  note: z.string().optional(),
  photoUrl: z.string().nullable().optional()
});

export async function POST(req: Request, ctx: Context) {
  try {
    const user = await getCurrentUser();
    const id = (await ctx.params).id;
    const body = statusSchema.parse(await req.json());

    const agentId = user?.agentId || 'DEL-AGT-01';
    const agentName = user?.name || 'Daniel Kumar';

    const order = updateDeliveryStatus(
      id,
      body.status as DeliveryStatus,
      agentId,
      agentName,
      body.note,
      body.photoUrl
    );

    return Response.json({ success: true, order });
  } catch (e) {
    const isZod = e instanceof z.ZodError;
    return Response.json(
      { error: isZod ? 'Invalid status transition' : e instanceof Error ? e.message : 'Delivery status update failed' },
      { status: 400 }
    );
  }
}
