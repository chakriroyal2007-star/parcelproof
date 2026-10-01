import { getTimeline } from '@/lib/db';
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

    const timeline = getTimeline(id);
    return Response.json({ timeline });
  } catch (e) {
    return Response.json({ error: 'Failed to fetch timeline' }, { status: 500 });
  }
}
