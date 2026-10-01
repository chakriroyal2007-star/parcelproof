import { calculateRefundAssessment, getRefundAssessment } from '@/lib/db';
import { getCurrentUser, authorizeCaseAccess } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Context) {
  try {
    const id = (await ctx.params).id;
    const user = await getCurrentUser();
    if (user && !authorizeCaseAccess(user, id)) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const assessment = getRefundAssessment(id) || calculateRefundAssessment(id);
    return Response.json({ assessment });
  } catch (e) {
    return Response.json({ error: 'Failed to retrieve assessment' }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: Context) {
  try {
    const id = (await ctx.params).id;
    const user = await getCurrentUser();
    if (user && !authorizeCaseAccess(user, id)) {
      return Response.json({ error: 'Access denied' }, { status: 403 });
    }

    const assessment = calculateRefundAssessment(id);
    return Response.json({ success: true, assessment });
  } catch (e) {
    return Response.json({ error: 'Recalculation failed' }, { status: 500 });
  }
}
