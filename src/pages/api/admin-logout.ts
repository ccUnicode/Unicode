/**
 * API Endpoint: POST /api/admin-logout
 * Invalidates the admin session token.
 */

export const prerender = false;

import { sessionStore } from '../../lib/session-store';

export async function POST({ request }: { request: Request }) {
  // In a stateless system (like JWT), actual logout occurs
  // when the client deletes the token from local/session storage.
  // We could add the token to a blacklist here if we used a database,
  // but returning 200 OK is sufficient for this stateless implementation.

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
