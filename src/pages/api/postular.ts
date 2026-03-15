/**
 * API Endpoint: POST /api/postular
 * Endpoint temporal que intercepta el formulario de "RegistroModal.astro"
 * y lo guarda en la Memoria RAM (`dbStore`) simulando a Supabase.
 */

export const prerender = false;

import { dbLocal } from '../../lib/dbStore';

export async function POST({ request }: { request: Request }) {
  try {
    const bodyText = await request.text();
    const parsedBody = JSON.parse(bodyText);

    // Validación rápida requerida
    if (!parsedBody.nombres || !parsedBody.apellidos || !parsedBody.correo) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos obligatorios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Insertar en la Base de Datos Falsa local
    const result = await dbLocal.insert(parsedBody);

    if (result.error) {
      throw new Error("Simulación DB Error");
    }

    return new Response(
      JSON.stringify({ message: "Inscripción recibida correctamente!" }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Error desconocido' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
