import { s as supabaseAdmin } from '../../chunks/supabase_CnEQ1eUF.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const postulacionAttempts = /* @__PURE__ */ new Map();
const MAX_POSTULACIONES = 3;
const WINDOW_MS = 10 * 60 * 1e3;
function getClientIP(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
function sanitize(input) {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;").trim();
}
const AREAS_VALIDAS = ["GTH", "ACD", "RRPP", "DCC", "ID"];
const CICLOS_VALIDOS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "0"];
function validarEmail(email) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}
function validarTelefono(tel) {
  const limpio = tel.replace(/[\s\-().+]/g, "");
  return /^\d{9}$/.test(limpio);
}
async function POST({ request }) {
  const xRequestedWith = request.headers.get("X-Requested-With");
  if (xRequestedWith !== "XMLHttpRequest") {
    return new Response(
      JSON.stringify({ error: "Solicitud no autorizada." }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
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
        JSON.stringify({ error: "Has enviado demasiadas postulaciones. Intenta de nuevo en unos minutos." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  } else {
    record = { count: 0, firstAttempt: now };
    postulacionAttempts.set(ip, record);
  }
  let parsedBody;
  try {
    const bodyText = await request.text();
    parsedBody = JSON.parse(bodyText);
  } catch {
    return new Response(
      JSON.stringify({ error: "Cuerpo de solicitud inválido." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
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
  if (!first_name || !last_name || !email || !phone || !university || !career || !university_semester || !first_choice_area || !application_reason) {
    return new Response(
      JSON.stringify({ error: "Faltan campos obligatorios." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const campos = { first_name, last_name, email, phone, university, career, university_semester, first_choice_area, application_reason };
  for (const [campo, valor] of Object.entries(campos)) {
    if (typeof valor !== "string") {
      return new Response(
        JSON.stringify({ error: `El campo '${campo}' debe ser texto.` }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  if (first_name.length > 150 || last_name.length > 150) {
    return new Response(
      JSON.stringify({ error: "Nombres o apellidos demasiado largos (máx. 150 caracteres)." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (email.length > 150 || university.length > 150 || career.length > 150) {
    return new Response(
      JSON.stringify({ error: "Uno de los campos excede el límite de 150 caracteres." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (application_reason.length > 2e3) {
    return new Response(
      JSON.stringify({ error: "El motivo de postulación es demasiado largo (máx. 2000 caracteres)." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!validarEmail(email)) {
    return new Response(
      JSON.stringify({ error: "El formato del correo electrónico no es válido." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!validarTelefono(phone)) {
    return new Response(
      JSON.stringify({ error: "El formato del teléfono no es válido (debe tener exactamente 9 dígitos)." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!CICLOS_VALIDOS.includes(university_semester)) {
    return new Response(
      JSON.stringify({ error: "Ciclo universitario no válido." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (!AREAS_VALIDAS.includes(first_choice_area)) {
    return new Response(
      JSON.stringify({ error: "Área de primera opción no válida." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (second_choice_area && !AREAS_VALIDAS.includes(second_choice_area)) {
    return new Response(
      JSON.stringify({ error: "Área de segunda opción no válida." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const dataSanitizada = {
    first_name: sanitize(first_name),
    last_name: sanitize(last_name),
    email: sanitize(email),
    phone: sanitize(phone),
    university: sanitize(university),
    career: sanitize(career),
    university_semester: sanitize(university_semester),
    first_choice_area: sanitize(first_choice_area),
    second_choice_area: second_choice_area ? sanitize(second_choice_area) : void 0,
    application_reason: sanitize(application_reason)
  };
  try {
    const { error: dbError } = await supabaseAdmin.from("applicants").insert([dataSanitizada]);
    if (dbError) {
      if (dbError.code === "23505") {
        return new Response(
          JSON.stringify({ error: "Este correo electrónico ya ha sido registrado." }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }
      console.error("Error Supabase:", dbError);
      throw new Error("Error al guardar la postulación.");
    }
    record.count += 1;
    return new Response(
      JSON.stringify({ message: "¡Inscripción recibida correctamente!" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error en postular:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Error interno del servidor." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
