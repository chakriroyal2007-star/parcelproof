import { z } from 'zod';
import { getCase, getAIConversation } from '@/lib/db';
import { LLMService } from '@/lib/llm-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

const chatBodySchema = z.object({
  message: z.string().min(1).max(2000)
});

export async function POST(req: Request, ctx: Context) {
  try {
    const origin = req.headers.get('origin');
    if (origin && (new URL(origin).host !== req.headers.get('host') || new URL(origin).protocol !== new URL(req.url).protocol)) {
      return Response.json({ error: 'Cross-origin requests rejected' }, { status: 403 });
    }

    const id = (await ctx.params).id;
    const body = chatBodySchema.parse(await req.json());
    const existingHistory = getAIConversation(id);

    const answer = await LLMService.answerCaseQuestion(id, body.message, existingHistory);
    const updatedCase = getCase(id);

    return Response.json({
      case: updatedCase,
      answer
    });
  } catch (e) {
    const validation = e instanceof z.ZodError;
    return Response.json(
      { error: validation ? 'Invalid chat request.' : e instanceof Error ? e.message : 'Chat operation failed.' },
      { status: validation ? 400 : 500 }
    );
  }
}
