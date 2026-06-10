/**
 * API Endpoint: POST /api/postular
 * Endpoint to receive recruitment applications.
 * 
 * Security measures:
 * - Field whitelisting (accepts only permitted fields)
 * - Format validation (email, phone, lengths)
 * - String sanitization (prevents stored XSS)
 * - Rate limiting (max 3 submissions per IP every 10 minutes)
 * - CSRF protection (validates X-Requested-With header)
 */

export const prerender = false;

import { supabaseAdmin } from '../../lib/supabase';

// --- Rate Limiter ---
const postulacionAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_POSTULACIONES = 3;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Extracts the client IP address from the request headers.
 * 
 * @param {Request} request - The incoming API request object.
 * @returns {string} The client IP address.
 */
function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Sanitizes input string to prevent stored XSS attacks.
 * 
 * @param {string} input - Unsanitized string.
 * @returns {string} Sanitized string.
 */
function sanitize(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

// --- Validations ---
const AREAS_VALIDAS = ['GTH', 'ACD', 'RRPP', 'DCC', 'ID'];
const CICLOS_VALIDOS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '0'];

/**
 * Validates the email format.
 * 
 * @param {string} email - Email address to check.
 * @returns {boolean} True if the email format is valid.
 */
function validarEmail(email: string): boolean {
  // Strict regex: requires @, a valid domain, and a TLD (e.g., .com, .pe) of at least 2 letters
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

/**
 * Validates the phone format.
 * 
 * @param {string} tel - Phone number to check.
 * @returns {boolean} True if the phone format contains exactly 9 digits.
 */
function validarTelefono(tel: string): boolean {
  const limpio = tel.replace(/[\s\-().+]/g, '');
  return /^\d{9}$/.test(limpio);
}

/**
 * POST handler for applicant registration.
 * 
 * @async
 * @param {Object} context - Request context containing the request object.
 * @param {Request} context.request - The API request object.
 * @returns {Promise<Response>} API Response indicating success or error status.
 */
export async function POST({ request }: { request: Request }) {
  // 1. CSRF Protection: validate request originates from our frontend
  const xRequestedWith = request.headers.get('X-Requested-With');
  if (xRequestedWith !== 'XMLHttpRequest') {
    return new Response(
      JSON.stringify({ error: 'Solicitud no autorizada.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Rate limiting check
  const ip = getClientIP(request);
  const now = Date.now();
  let record = postulacionAttempts.get(ip);

  if (record) {
    if (now - record.firstAttempt > WINDOW_MS) {
      record = { count: 0, firstAttempt: now };
      postulacionAttempts.set(ip, record);
    }

    if (record.count >= MAX_POSTULACIONES) {
      return new Response(
        JSON.stringify({ error: 'Has enviado demasiadas postulaciones. Intenta de nuevo en unos minutos.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } else {
    record = { count: 0, firstAttempt: now };
    postulacionAttempts.set(ip, record);
  }

  // 3. Parse request body
  let parsedBody: any;
  try {
    const bodyText = await request.text();
    parsedBody = JSON.parse(bodyText);
  } catch {
    return new Response(
      JSON.stringify({ error: 'Cuerpo de solicitud inválido.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 4. Whitelist - extract ONLY permitted fields
  const {
    first_name,
    last_name,
    email,
    phone,
    university,
    career,
    university_semester,
    first_choice_area,
    second_choice_area,
    application_reason
  } = parsedBody;

  // 5. Validate required fields
  if (!first_name || !last_name || !email || !phone || !university || !career || !university_semester || !first_choice_area || !application_reason) {
    return new Response(
      JSON.stringify({ error: 'Faltan campos obligatorios.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 6. Validate types (all fields must be strings)
  const campos = { first_name, last_name, email, phone, university, career, university_semester, first_choice_area, application_reason };
  for (const [campo, valor] of Object.entries(campos)) {
    if (typeof valor !== 'string') {
      return new Response(
        JSON.stringify({ error: `El campo '${campo}' debe ser texto.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // 7. Validate field lengths
  if (first_name.length > 150 || last_name.length > 150) {
    return new Response(
      JSON.stringify({ error: 'Nombres o apellidos demasiado largos (máx. 150 caracteres).' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (email.length > 150 || university.length > 150 || career.length > 150) {
    return new Response(
      JSON.stringify({ error: 'Uno de los campos excede el límite de 150 caracteres.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (application_reason.length > 2000) {
    return new Response(
      JSON.stringify({ error: 'El motivo de postulación es demasiado largo (máx. 2000 caracteres).' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 8. Validate specific formats
  if (!validarEmail(email)) {
    return new Response(
      JSON.stringify({ error: 'El formato del correo electrónico no es válido.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (!validarTelefono(phone)) {
    return new Response(
      JSON.stringify({ error: 'El formato del teléfono no es válido (debe tener exactamente 9 dígitos).' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (!CICLOS_VALIDOS.includes(university_semester)) {
    return new Response(
      JSON.stringify({ error: 'Ciclo universitario no válido.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (!AREAS_VALIDAS.includes(first_choice_area)) {
    return new Response(
      JSON.stringify({ error: 'Área de primera opción no válida.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  if (second_choice_area && !AREAS_VALIDAS.includes(second_choice_area)) {
    return new Response(
      JSON.stringify({ error: 'Área de segunda opción no válida.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 9. Sanitize all fields (prevents stored XSS)
  const dataSanitizada = {
    first_name: sanitize(first_name),
    last_name: sanitize(last_name),
    email: sanitize(email),
    phone: sanitize(phone),
    university: sanitize(university),
    career: sanitize(career),
    university_semester: sanitize(university_semester),
    first_choice_area: sanitize(first_choice_area),
    second_choice_area: second_choice_area ? sanitize(second_choice_area) : undefined,
    application_reason: sanitize(application_reason),
  };

  // 10. Insert record into Supabase database
  try {
    const { error: dbError } = await supabaseAdmin
      .from('applicants')
      .insert([dataSanitizada]);

    if (dbError) {
      if (dbError.code === '23505') {
        return new Response(
          JSON.stringify({ error: 'Este correo electrónico ya ha sido registrado.' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
      console.error('Error Supabase:', dbError);
      throw new Error('Error al guardar la postulación.');
    }

    // Increment rate limit attempts counter only on success
    record.count += 1;

    return new Response(
      JSON.stringify({ message: '¡Inscripción recibida correctamente!' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error en postular:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
