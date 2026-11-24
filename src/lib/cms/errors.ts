/**
 * Manejo unificado de errores, respuestas JSON y lectura segura de payloads
 * para los endpoints HTTP del módulo CMS Unicode.
 */

const MAX_JSON_BODY_BYTES = 128 * 1024;

export class CmsError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = 'CmsError';
  }
}

export function cmsJson(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export function handleCmsApiError(error: unknown): Response {
  if (error instanceof CmsError) {
    return cmsJson(
      {
        error: error.message,
        code: error.code,
        ...(error.details ? { details: error.details } : {}),
      },
      error.status,
    );
  }
  return cmsJson(
    {
      error: 'Error interno al procesar la solicitud del CMS.',
      code: 'internal_error',
    },
    500,
  );
}

export async function readCmsJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new CmsError(
      'invalid_content_type',
      'La solicitud debe enviarse con Content-Type: application/json.',
      400,
    );
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BODY_BYTES) {
    throw new CmsError(
      'payload_too_large',
      'El cuerpo de la solicitud excede el tamaño máximo permitido.',
      413,
    );
  }

  if (!request.body) {
    throw new CmsError('invalid_body', 'El cuerpo de la solicitud está vacío.', 400);
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let text = '';

  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      totalBytes += chunk.value.byteLength;
      if (totalBytes > MAX_JSON_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new CmsError(
          'payload_too_large',
          'El cuerpo de la solicitud excede el tamaño máximo permitido.',
          413,
        );
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }

  if (!text.trim()) {
    throw new CmsError('invalid_body', 'El cuerpo JSON está vacío.', 400);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new CmsError('invalid_json', 'El cuerpo de la solicitud no es un JSON válido.', 400);
  }
}
