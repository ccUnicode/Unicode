import { sessionStore } from '../../chunks/sessionStore_Bt5E9fqU.mjs';
import { s as supabaseAdmin } from '../../chunks/supabase_CnEQ1eUF.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
async function GET({ request }) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  console.log("API /admin-postulantes HIT");
  console.log("PUBLIC_SUPABASE_URL:", "OK" );
  console.log("SUPABASE_SERVICE_ROLE_KEY:", "OK" );
  if (!token || !await sessionStore.isValid(token)) {
    console.warn("Unauthorized attempt or invalid token");
    return new Response(
      JSON.stringify({ error: "No autorizado. Inicia sesión nuevamente." }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  const url = new URL(request.url);
  const area = url.searchParams.get("area") || "";
  const opcion = url.searchParams.get("opcion") || "todas";
  const orden = url.searchParams.get("orden") || "reciente";
  try {
    const { data: test, error: testErr } = await supabaseAdmin.from("applicants").select("count");
    console.log("Supabase check:", { test, testErr });
    const { data, error } = await supabaseAdmin.from("applicants").select("*");
    if (error) {
      console.error("Error Supabase en /api/admin-postulantes:", error);
      return new Response(
        JSON.stringify({ error: "Error al obtener datos de Supabase." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    let filteredData = data || [];
    if (area) {
      filteredData = filteredData.filter((p) => {
        if (opcion === "1ra") return p.first_choice_area === area;
        if (opcion === "2da") return p.second_choice_area === area;
        return p.first_choice_area === area || p.second_choice_area === area;
      });
    }
    filteredData = filteredData.sort((a, b) => {
      if (area && orden === "1ra-2da") {
        const aIs1ra = a.first_choice_area === area;
        const bIs1ra = b.first_choice_area === area;
        if (aIs1ra && !bIs1ra) return -1;
        if (!aIs1ra && bIs1ra) return 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return new Response(
      JSON.stringify({ data: filteredData, total: filteredData.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Error del servidor: " + err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
