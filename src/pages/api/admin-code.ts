/**
 * API Endpoint: POST /api/admin-code
 * Sends a one-time sign-in code to a director's email. The answer never reveals whether the email has access.
 */

export const prerender = false;

import { requestLoginCode } from '../../lib/admin-access';
import { RecruitmentError } from '../../lib/recruitment/validation';

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
// In-memory limit per IP on top of the per-email limit kept in the database.
const requests = new Map<string, number[]>();

export async function POST({ request }: { request: Request }) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  const now = Date.now();
  const recent = (requests.get(ip) || []).filter((time) => now - time < 15 * 60 * 1000);
  if (recent.length >= 10) return json({ error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' }, 429);
  requests.set(ip, [...recent, now]);
  try {
    return json(await requestLoginCode(await request.json().catch(() => null)));
  } catch (error) {
    if (error instanceof RecruitmentError) return json({ error: error.message }, error.status);
    return json({ error: 'No se pudo enviar el código. Intenta de nuevo.' }, 503);
  }
}
