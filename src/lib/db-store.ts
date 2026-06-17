/**
 * db-store.ts
 * Temporary In-Memory Database Simulator for testing.
 * Allows saving applications and listing them in /admin without real Supabase connection.
 */

// Applicant Structure
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

// RAM In-Memory Simulator using Singleton pattern
class TemporaryDatabase {
  private applicants: Applicant[] = [];

  constructor() {
    // You can inject mock test data here if desired,
    // but for now it is left empty for form submissions.
  }

  // Method to save a new record from the form
  async insert(data: Omit<Applicant, "id" | "created_at">) {
    const newRecord: Applicant = {
      ...data,
      id: crypto.randomUUID(), // Generates a temporary mock ID
      created_at: new Date().toISOString(), // Real current date
    };

    this.applicants.push(newRecord);
    return { data: newRecord, error: null };
  }

  // Method to read data from the admin dashboard
  async select() {
    // Simulates internet loading latency (200ms)
    await new Promise((res) => setTimeout(res, 200));
    return { data: [...this.applicants], error: null };
  }
}

// Exported global instance
export const localDb = new TemporaryDatabase();
