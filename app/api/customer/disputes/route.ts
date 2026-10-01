import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { createCustomerDispute, getCase } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const disputeSchema = z.object({
  orderId: z.string().optional(),
  item: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  category: z.enum(['not_received', 'wrong_location', 'incorrect_photo', 'damaged', 'other']),
  description: z.string().min(5).max(3000),
  photoUrl: z.string().nullable().optional()
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'CUSTOMER' || !user.accountId) {
      return Response.json({ error: 'Unauthorized customer access' }, { status: 401 });
    }

    const body = disputeSchema.parse(await req.json());
    const order = createCustomerDispute(user.accountId, user.name, body);
    const caseData = getCase(order.id);

    return Response.json({ success: true, order, caseData });
  } catch (e) {
    const validation = e instanceof z.ZodError;
    return Response.json(
      { error: validation ? 'Invalid dispute input' : e instanceof Error ? e.message : 'Dispute creation failed' },
      { status: validation ? 400 : 500 }
    );
  }
}
