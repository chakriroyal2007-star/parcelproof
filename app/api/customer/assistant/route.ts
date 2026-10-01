import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { LLMService } from '@/lib/llm-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const customerAskSchema = z.object({
  caseId: z.string(),
  question: z.string().min(1).max(1000)
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'CUSTOMER') {
      return Response.json({ error: 'Customer authentication required' }, { status: 401 });
    }

    const body = customerAskSchema.parse(await req.json());
    const answer = await LLMService.answerCustomerQuestion(body.caseId, body.question, user);

    return Response.json(answer);
  } catch (e) {
    const validation = e instanceof z.ZodError;
    return Response.json(
      { error: validation ? 'Invalid query payload' : 'Customer AI request failed' },
      { status: 400 }
    );
  }
}
