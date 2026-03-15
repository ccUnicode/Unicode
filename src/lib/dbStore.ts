/**
 * dbStore.ts
 * Simulador temporal de Base de Datos en Memoria para testing.
 * Permite guardar las postulaciones y listarlas en /admin sin Supabase real.
 */

// Estructura de un Postulante
export interface Postulante {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  universidad: string;
  carrera: string;
  ciclo_universidad: string;
  opcion1: string;
  opcion2?: string;
  motivo_postulacion: string;
  created_at: string;
}

// Simulador en memoria RAM usando el patrón Singleton
class TemporaryDatabase {
  private postulantes: Postulante[] = [];

  constructor() {
    // Si quieres podemos inyectar data de prueba falsa aquí, 
    // pero de momento lo dejamos vacío para que uses tú el formulario.
  }

  // Método para guardar un nuevo registro desde el formulario
  async insert(data: Omit<Postulante, "id" | "created_at">) {
    const nuevoRegistro: Postulante = {
      ...data,
      id: crypto.randomUUID(), // Genera un ID fake temporal
      created_at: new Date().toISOString(), // Fecha actual real
    };

    this.postulantes.push(nuevoRegistro);
    return { data: nuevoRegistro, error: null };
  }

  // Método para leer datos desde el dashboard admin
  async select() {
    // Simula el tiempo de carga del internet (200ms)
    await new Promise((res) => setTimeout(res, 200));
    return { data: [...this.postulantes], error: null };
  }
}

// Instancia global exportada
export const dbLocal = new TemporaryDatabase();
