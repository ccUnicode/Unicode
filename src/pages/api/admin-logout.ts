/**
 * API Endpoint: POST /api/admin-logout
 * Invalidates the admin session token.
 */

export const prerender = false;

import { sessionStore } from '../../lib/sessionStore';

export async function POST({ request }: { request: Request }) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');

  if (token) {
    sessionStore.delete(token);
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
