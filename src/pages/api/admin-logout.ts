/**
 * API Endpoint: POST /api/admin-logout
 * Invalidates the admin session token.
 */

export const prerender = false;

import { sessionStore } from '../../lib/sessionStore';

export async function POST({ request }: { request: Request }) {
  // En un sistema stateless (como JWT), el cierre de sesión real ocurre
  // cuando el cliente borra el token de su local/session storage.
  // Aquí podríamos añadir el token a una blacklist si usáramos base de datos,
  // pero para este caso basta con devolver un 200 OK.

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
