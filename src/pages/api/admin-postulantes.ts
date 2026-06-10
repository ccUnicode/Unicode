/**
 * API Endpoint: GET /api/admin-postulantes
 * Returns postulantes data from Supabase.
 * Requires a valid session token in the Authorization header.
 */

export const prerender = false;

import { sessionStore } from '../../lib/sessionStore';
import { supabaseAdmin } from '../../lib/supabase';

/**
 * GET handler to fetch applicant details from Supabase with search/filter options.
 *
 * @async
 * @param {Object} context - Request context containing the request object.
 * @param {Request} context.request - The API request object.
 * @returns {Promise<Response>} API Response with applicants dataset.
 */
export async function GET({ request }: { request: Request }) {
  // Validate session token
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');

  console.log('API /admin-postulantes HIT');
  console.log('PUBLIC_SUPABASE_URL:', import.meta.env.PUBLIC_SUPABASE_URL ? 'OK' : 'MISSING');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', import.meta.env.SUPABASE_SERVICE_ROLE_KEY ? 'OK' : 'MISSING');
  if (!token || !(await sessionStore.isValid(token))) {
    console.warn('Unauthorized attempt or invalid token');
    return new Response(
      JSON.stringify({ error: 'No autorizado. Inicia sesión nuevamente.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Parse query params for filtering
  const url = new URL(request.url);
  const area = url.searchParams.get('area') || '';
  const opcion = url.searchParams.get('opcion') || 'todas'; // 'todas', '1ra', '2da'
  const orden = url.searchParams.get('orden') || 'reciente'; // 'reciente', '1ra-2da'

  try {
    const { data: test, error: testErr } = await supabaseAdmin.from('applicants').select('count');
    console.log('Supabase check:', { test, testErr });

    // Call real Supabase table using the admin client credentials
    const { data, error } = await supabaseAdmin
      .from('applicants')
      .select('*');

    if (error) {
      console.error('Error Supabase en /api/admin-postulantes:', error);
      return new Response(
        JSON.stringify({ error: 'Error al obtener datos de Supabase.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let filteredData = data || [];

    // Filter by area
    if (area) {
      filteredData = filteredData.filter((p: any) => {
        if (opcion === '1ra') return p.first_choice_area === area;
        if (opcion === '2da') return p.second_choice_area === area;
        return p.first_choice_area === area || p.second_choice_area === area;
      });
    }

    // Sort and Order
    filteredData = filteredData.sort((a: any, b: any) => {
      // 1) Sort by option priority if specified
      if (area && orden === '1ra-2da') {
        const aIs1ra = a.first_choice_area === area;
        const bIs1ra = b.first_choice_area === area;
        if (aIs1ra && !bIs1ra) return -1;
        if (!aIs1ra && bIs1ra) return 1;
      }
      // 2) Default sorting: most recent first (based on date)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return new Response(
      JSON.stringify({ data: filteredData, total: filteredData.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Error del servidor: ' + err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
