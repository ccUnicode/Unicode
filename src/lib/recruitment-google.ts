/** Server-only OAuth credentials; applicants never receive Google access tokens. */
let cached: { value: string; expiresAt: number } | undefined;

function required(name: string): string {
  const value = import.meta.env[name] || process.env[name];
  if (!value) throw new Error(`Integración Google pendiente: falta ${name}.`);
  return value;
}

export function googleConfigured(): boolean {
  return ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'].every(
    (name) => Boolean(import.meta.env[name] || process.env[name]),
  );
}

export async function googleAccessToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: required('GOOGLE_CLIENT_ID'),
      client_secret: required('GOOGLE_CLIENT_SECRET'),
      refresh_token: required('GOOGLE_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error('No se pudo renovar la autorización de Google.');
  const data = await response.json() as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error('Google no devolvió una autorización válida.');
  cached = { value: data.access_token, expiresAt: Date.now() + (data.expires_in || 300) * 1000 };
  return cached.value;
}

export async function googleRequest(url: string, init: RequestInit = {}): Promise<Response> {
  const target = new URL(url);
  if (target.protocol !== 'https:' || !['www.googleapis.com', 'gmail.googleapis.com'].includes(target.hostname)) {
    throw new Error('Destino de Google no permitido.');
  }
  return fetch(url, {
    ...init,
    headers: { ...Object.fromEntries(new Headers(init.headers)), Authorization: `Bearer ${await googleAccessToken()}` },
    signal: init.signal || AbortSignal.timeout(20_000),
  });
}
