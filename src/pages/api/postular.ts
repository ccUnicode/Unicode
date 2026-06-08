/**
 * API Endpoint: POST /api/postular
 * Endpoint para recibir postulaciones de la convocatoria.
 * 
 * Medidas de seguridad:
 * - Whitelist de campos (solo acepta campos permitidos)
 * - Validación de formatos (correo, teléfono, longitudes)
 * - Sanitización de strings (previene XSS almacenado)
 * - Rate limiting (máx 3 postulaciones por IP cada 10 min)
 * - Protección CSRF (valida header X-Requested-With)
 */

export const prerender = false;

import { supabaseAdmin } from '../../lib/supabase';

// --- Rate Limiter ---
const postulacionAttempts = new Map<string, { count: number; firstAttempt: number }>();
const MAX_POSTULACIONES = 3;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutos

function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// --- Sanitización ---
function sanitize(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

// --- Validaciones ---
const AREAS_VALIDAS = ['GTH', 'ACD', 'RRPP', 'DCC', 'ID'];
const CICLOS_VALIDOS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '0'];

function validarEmail(email: string): boolean {
  // Regex más estricto: requiere @, un dominio válido, y una extensión (ej. .com, .pe) de al menos 2 letras
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

function validarTelefono(tel: string): boolean {
  const limpio = tel.replace(/[\s\-().+]/g, '');
  return /^\d{9}$/.test(limpio);
}

export async function POST({ request }: { request: Request }) {
  // 1. Protección CSRF: validar que venga de nuestro frontend
  const xRequestedWith = request.headers.get('X-Requested-With');
  if (xRequestedWith !== 'XMLHttpRequest') {
    return new Response(
      JSON.stringify({ error: 'Solicitud no autorizada.' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Rate limiting
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

  // 3. Parsear body
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

  // 4. Whitelist — extraer SOLO los campos permitidos
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

  // 5. Validar campos obligatorios
  if (!first_name || !last_name || !email || !phone || !university || !career || !university_semester || !first_choice_area || !application_reason) {
    return new Response(
      JSON.stringify({ error: 'Faltan campos obligatorios.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 6. Validar tipos (todos deben ser strings)
  const campos = { first_name, last_name, email, phone, university, career, university_semester, first_choice_area, application_reason };
  for (const [campo, valor] of Object.entries(campos)) {
    if (typeof valor !== 'string') {
      return new Response(
        JSON.stringify({ error: `El campo '${campo}' debe ser texto.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // 7. Validar longitudes
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

  // 8. Validar formatos específicos
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

  // 9. Sanitizar todos los campos (previene XSS almacenado)
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

  // 10. Insertar en la base de datos Supabase
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

    // Incrementar el conteo de rate limiting solo en éxito
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
