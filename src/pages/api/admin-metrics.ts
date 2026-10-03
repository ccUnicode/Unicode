/**
 * API Endpoint: GET /api/admin-metrics
 * Summary figures for the directors' dashboard. Any signed-in director can read them.
 */

export const prerender = false;

import { sessionStore } from '../../lib/session-store';
import { adminMetrics } from '../../lib/recruitment/service';

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function GET({ request }: { request: Request }) {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '');
  if (!(await sessionStore.verify(token))) return json({ error: 'No autorizado. Inicia sesión nuevamente.' }, 401);
  try {
    return json(await adminMetrics());
  } catch {
    return json({ error: 'No se pudieron calcular las métricas.' }, 500);
  }
}
