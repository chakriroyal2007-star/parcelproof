import { z } from 'zod';
import { db, getCase, getAnalysis, getRefund, mode, saveNextAgentBrief } from '@/lib/db';
import { analyze, approve, saveHandoff } from '@/lib/engine';
import { LLMService } from '@/lib/llm-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Context) {
  try {
    return Response.json(getCase((await ctx.params).id));
  } catch {
    return Response.json({ error: 'Order not found' }, { status: 404 });
  }
}

const bodySchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('analyze') }),
  z.object({ operation: z.literal('reply') }),
  z.object({ operation: z.literal('draft_ai') }),
  z.object({ operation: z.literal('approve'), key: z.string().min(8).max(120), analysisId: z.string().uuid() }),
  z.object({ operation: z.literal('handoff') }),
  z.object({ operation: z.literal('switch') }),
  z.object({ operation: z.literal('draft'), text: z.string().max(10000) }),
  z.object({ operation: z.literal('brief') }),
  z.object({ operation: z.literal('clear_chat') })
]);

export async function POST(req: Request, ctx: Context) {
  try {
    const origin = req.headers.get('origin');
    if (origin && (new URL(origin).host !== req.headers.get('host') || new URL(origin).protocol !== new URL(req.url).protocol)) {
      return Response.json({ error: 'Cross-origin requests rejected' }, { status: 403 });
    }
    const id = (await ctx.params).id;
    const current = getCase(id);
    const body = bodySchema.parse(await req.json());
    let result: unknown = null;

    if (body.operation === 'analyze') {
      result = await analyze(id);
      // Auto-update brief upon re-analysis
      const brief = await LLMService.generateHandoffBrief(id, current.activeAgent);
      saveNextAgentBrief(id, brief);
    }

    if (body.operation === 'approve') {
      result = approve(id, current.activeAgent, body.key, body.analysisId);
      const brief = await LLMService.generateHandoffBrief(id, current.activeAgent);
      saveNextAgentBrief(id, brief);
    }

    if (body.operation === 'reply' || body.operation === 'draft_ai') {
      const text = await LLMService.draftCustomerResponse(id);
      db().prepare('INSERT INTO drafts VALUES(?,?) ON CONFLICT(orderId) DO UPDATE SET text=excluded.text').run(id, text);
      result = { text };
    }

    if (body.operation === 'draft') {
      db().prepare('INSERT INTO drafts VALUES(?,?) ON CONFLICT(orderId) DO UPDATE SET text=excluded.text').run(id, body.text);
    }

    if (body.operation === 'handoff' || body.operation === 'switch') {
      result = saveHandoff(id, current.activeAgent);
      const brief = await LLMService.generateHandoffBrief(id, current.activeAgent);
      saveNextAgentBrief(id, brief);
    }

    if (body.operation === 'brief') {
      result = await LLMService.generateHandoffBrief(id, current.activeAgent);
    }

    if (body.operation === 'clear_chat') {
      db().prepare('DELETE FROM ai_conversations WHERE orderId=?').run(id);
      result = { cleared: true };
    }

    if (body.operation === 'switch') {
      const next = current.activeAgent === 'Priya Shah' ? 'Daniel Kim' : 'Priya Shah';
      db().prepare('INSERT INTO sessions VALUES(?,?) ON CONFLICT(orderId) DO UPDATE SET agent=excluded.agent').run(id, next);
    }

    return Response.json({ case: getCase(id), result });
  } catch (e) {
    const validation = e instanceof z.ZodError;
    return Response.json(
      { error: validation ? 'Invalid request.' : e instanceof Error ? e.message : 'Operation failed. No result available.' },
      { status: validation ? 400 : 409 }
    );
  }
}

