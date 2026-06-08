/**
 * dbStore.ts
 * Simulador temporal de Base de Datos en Memoria para testing.
 * Permite guardar las postulaciones y listarlas en /admin sin Supabase real.
 */

// Estructura de un Postulante
export interface Applicant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  university: string;
  career: string;
  university_semester: string;
  first_choice_area: string;
  second_choice_area?: string;
  application_reason: string;
  created_at: string;
}

// Simulador en memoria RAM usando el patrón Singleton
class TemporaryDatabase {
  private applicants: Applicant[] = [];

  constructor() {
    // Si quieres podemos inyectar data de prueba falsa aquí, 
    // pero de momento lo dejamos vacío para que uses tú el formulario.
  }

  // Método para guardar un nuevo registro desde el formulario
  async insert(data: Omit<Applicant, "id" | "created_at">) {
    const nuevoRegistro: Applicant = {
      ...data,
      id: crypto.randomUUID(), // Genera un ID fake temporal
      created_at: new Date().toISOString(), // Fecha actual real
    };

    this.applicants.push(nuevoRegistro);
    return { data: nuevoRegistro, error: null };
  }

  // Método para leer datos desde el dashboard admin
  async select() {
    // Simula el tiempo de carga del internet (200ms)
    await new Promise((res) => setTimeout(res, 200));
    return { data: [...this.applicants], error: null };
  }
}

// Instancia global exportada
export const dbLocal = new TemporaryDatabase();
