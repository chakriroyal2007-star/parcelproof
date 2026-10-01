export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const headers = new Headers();
  headers.append(
    'Set-Cookie',
    'parcelproof_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
  );
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...Object.fromEntries(headers.entries())
    }
  });
}
