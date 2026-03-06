// Mantenemos interfaces base hasta que Database sea generada automáticamente
export interface Area {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  objectives?: string;
  created_at?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'activo' | 'pasado';
  tag: string;
  area_id?: string;
  created_at?: string;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  type: string;
  imageUrl?: string;
  status: 'proximo' | 'realizado';
  created_at?: string;
}

export interface Metric {
  id: string;
  active_members: number;
  completed_projects: number;
  events_held: number;
  years_experience: number;
}
