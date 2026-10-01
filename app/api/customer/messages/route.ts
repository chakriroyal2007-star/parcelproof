import { z } from 'zod';
import { getCurrentUser, authorizeCaseAccess } from '@/lib/auth';
import { addCustomerMessage, getCase } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const messageSchema = z.object({
  caseId: z.string(),
  message: z.string().min(1).max(2000)
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'CUSTOMER') {
      return Response.json({ error: 'Unauthorized customer access' }, { status: 401 });
    }

    const body = messageSchema.parse(await req.json());
    if (!authorizeCaseAccess(user, body.caseId)) {
      return Response.json({ error: 'Access denied for this case' }, { status: 403 });
    }

    const source = addCustomerMessage(body.caseId, user.name, body.message);
    const updatedCase = getCase(body.caseId);

    return Response.json({ success: true, source, caseData: updatedCase });
  } catch (e) {
    const validation = e instanceof z.ZodError;
    return Response.json(
      { error: validation ? 'Invalid message payload' : 'Failed to send message' },
      { status: 400 }
    );
  }
}
