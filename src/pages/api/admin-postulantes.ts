/**
 * API Endpoint: GET /api/admin-postulantes
 * Returns postulantes data from Supabase.
 * Requires a valid session token in the Authorization header.
 */

export const prerender = false;

import { sessionStore } from '../../lib/sessionStore';
import { dbLocal } from '../../lib/dbStore';

export async function GET({ request }: { request: Request }) {
  // Validate session token
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token || !sessionStore.isValid(token)) {
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
    // LLAMAMOS AL ALMACÉN FALSO EN RAM EN LUGAR DE SUPABASE
    const { data, error } = await dbLocal.select();

    if (error) {
      return new Response(
        JSON.stringify({ error: 'Error al obtener datos simulados.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let filteredData = data || [];

    // Filter by area
    if (area) {
      filteredData = filteredData.filter((p: any) => {
        if (opcion === '1ra') return p.opcion1 === area;
        if (opcion === '2da') return p.opcion2 === area;
        return p.opcion1 === area || p.opcion2 === area;
      });
    }

    // Sort y Order
    filteredData = filteredData.sort((a: any, b: any) => {
      // 1) Si ordenan por prioridad de opciones
      if (area && orden === '1ra-2da') {
        const aIs1ra = a.opcion1 === area;
        const bIs1ra = b.opcion1 === area;
        if (aIs1ra && !bIs1ra) return -1;
        if (!aIs1ra && bIs1ra) return 1;
      }
      // 2) Default a más recientes (fecha)
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
