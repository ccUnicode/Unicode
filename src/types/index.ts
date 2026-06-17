// Keep base interfaces until database types are automatically generated
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
  status: 'active' | 'inactive';
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
  status: 'upcoming' | 'completed';
  created_at?: string;
}

export interface Metric {
  id: string;
  active_members: number;
  completed_projects: number;
  events_held: number;
  years_experience: number;
}
