import type { CmsEvent, CmsCallPublicSettings } from '../../types/cms';
import { upcomingEvents, completedEvents } from '../../data/events';

/**
 * Genera eventos de respaldo a partir de los datos estáticos de `src/data/events.ts`.
 * Se utiliza ante indisponibilidad temporal de la base de datos para no interrumpir el servicio público.
 */
export function getEventsFallback(): CmsEvent[] {
  const upcoming: CmsEvent[] = upcomingEvents.map((e, index) => ({
    id: e.id || `fallback-upcoming-${index}`,
    title: e.speaker,
    slug: (e.speaker || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    topic: e.topic,
    description: e.description,
    shortDescription: e.description.slice(0, 160),
    eventType: 'upcoming',
    status: 'published',
    date: e.date,
    time: e.time,
    location: e.location,
    category: 'Tecnología',
    speakers: [
      {
        name: e.speaker,
        image: e.speakerImage,
      },
    ],
    image: e.speakerImage || '/mascota/mascota-unicode-fondo-individual.webp',
    backgroundImage: e.backgroundImage,
    registrationUrl: e.registrationUrl,
    areaScope: 'DCC',
    featuredInHome: true,
    homeOrder: index + 1,
    createdBy: 'system-fallback',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const completed: CmsEvent[] = completedEvents.map((e, index) => ({
    id: `fallback-completed-${index}`,
    title: e.title,
    slug: e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: e.description,
    shortDescription: e.description.slice(0, 160),
    eventType: 'completed',
    status: 'published',
    date: e.date,
    location: e.location,
    category: e.category,
    attendees: e.attendees,
    speakers: [
      {
        name: e.speaker,
      },
    ],
    image: e.image,
    highlights: e.highlights,
    externalLink: e.link,
    areaScope: 'DCC',
    featuredInHome: false,
    createdBy: 'system-fallback',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  return [...upcoming, ...completed];
}

/**
 * Configuración de respaldo por defecto para /call ante fallas de base de datos.
 */
export function getCallConfigFallback(): CmsCallPublicSettings {
  return {
    enabled: true,
    title: 'Convocatoria General',
    subtitle: 'Únete al Centro Cultural UNICODE',
    heroDescription:
      'Buscamos estudiantes apasionados por la tecnología, la innovación y el trabajo en equipo.',
    opensAt: null,
    closesAt: null,
    extensionAt: null,
    scheduleStages: [
      {
        id: 'stage-1',
        title: 'Inscripciones y Postulación',
        description: 'Registro de datos personales y área de interés.',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        order: 1,
      },
      {
        id: 'stage-2',
        title: 'Evaluación y Entrevistas',
        description: 'Revisión de perfiles y entrevistas por directores de área.',
        startDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'upcoming',
        order: 2,
      },
    ],
    areaRequirements: [
      {
        areaId: 'ID',
        name: 'Investigación y Desarrollo',
        description: 'Desarrollo de software, investigación tecnológica y proyectos open-source.',
        requirements: ['Compromiso semanal de 6 horas', 'Interés en desarrollo web o IA'],
        profiles: ['Frontend Developer', 'Backend Developer', 'Data Analyst'],
        enabled: true,
      },
    ],
    registrationUrl: '/postular',
  };
}

/**
 * Envuelve una consulta con fallback seguro y logueo estandarizado de errores.
 */
export async function withFallback<T>(
  operation: () => Promise<T>,
  fallbackValue: T | (() => T),
  contextName: string
): Promise<T> {
  try {
    return await operation();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[CMS Fallback] Operación '${contextName}' falló. Usando datos de respaldo. Causa:`, message);
    return typeof fallbackValue === 'function' ? (fallbackValue as () => T)() : fallbackValue;
  }
}
