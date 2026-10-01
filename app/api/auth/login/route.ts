import { z } from 'zod';
import { authenticateUser, encodeSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(req: Request) {
  try {
    const body = loginSchema.parse(await req.json());
    const user = authenticateUser(body.email, body.password);
    if (!user) {
      return Response.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = encodeSession(user);
    const headers = new Headers();
    headers.append(
      'Set-Cookie',
      `parcelproof_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
    );

    return new Response(JSON.stringify({ user }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...Object.fromEntries(headers.entries())
      }
    });
  } catch (e) {
    const validation = e instanceof z.ZodError;
    return Response.json(
      { error: validation ? 'Invalid credentials format' : 'Login failed' },
      { status: 400 }
    );
  }
}
