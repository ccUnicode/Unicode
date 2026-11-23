import { supabaseAdmin } from '../supabase';
import type {
  CmsCallPublicSettings,
  CmsCallScheduleStage,
  CmsCallAreaRequirement,
  UpdateCmsCallPublicSettingsInput,
  CmsSessionUser,
} from '../../types/cms';
import { getCallConfigFallback } from './fallback';

/**
 * Error especializado para la capa de servicios de Convocatoria en el CMS.
 */
export class CmsCallServiceError extends Error {
  constructor(
    public readonly code:
      | 'FORBIDDEN_AREA'
      | 'VALIDATION_ERROR'
      | 'CONCURRENCY_CONFLICT'
      | 'DATABASE_ERROR'
      | 'NOT_FOUND',
    message: string,
    public readonly status: number = 400,
    public readonly details: unknown = null
  ) {
    super(message);
    this.name = 'CmsCallServiceError';
  }
}

/**
 * Normaliza y combina los datos de `recruitment_config.settings` con el nodo `publicCall`,
 * garantizando una estructura completa de tipo `CmsCallPublicSettings`.
 */
export function normalizeCallPublicSettings(
  rawSettings: Record<string, unknown> | null | undefined
): CmsCallPublicSettings {
  const fallback = getCallConfigFallback();
  if (!rawSettings) {
    return fallback;
  }

  const publicCall = (rawSettings.publicCall && typeof rawSettings.publicCall === 'object'
    ? rawSettings.publicCall
    : {}) as Record<string, unknown>;

  // Extraer etapas del cronograma
  let scheduleStages: CmsCallScheduleStage[] = fallback.scheduleStages;
  if (Array.isArray(publicCall.scheduleStages) && publicCall.scheduleStages.length > 0) {
    scheduleStages = publicCall.scheduleStages as CmsCallScheduleStage[];
  }

  // Extraer requisitos por área
  let areaRequirements: CmsCallAreaRequirement[] = fallback.areaRequirements;
  if (Array.isArray(publicCall.areaRequirements) && publicCall.areaRequirements.length > 0) {
    areaRequirements = publicCall.areaRequirements as CmsCallAreaRequirement[];
  } else if (Array.isArray(rawSettings.areas)) {
    // Si no hay requisitos personalizados en publicCall, mapear las áreas habilitadas de recruitment_config
    areaRequirements = (rawSettings.areas as Array<{ id: string; name?: string; enabled?: boolean }>).map(
      (area) => ({
        areaId: area.id as any,
        name: area.name || area.id,
        description: `Área de ${area.name || area.id} en UNICODE.`,
        requirements: ['Compromiso semanal de 6 horas', 'Interés en formación continua'],
        profiles: ['Miembro General', 'Practicante'],
        enabled: Boolean(area.enabled),
      })
    );
  }

  return {
    enabled: typeof rawSettings.enabled === 'boolean' ? rawSettings.enabled : fallback.enabled,
    title: typeof rawSettings.title === 'string' ? rawSettings.title : fallback.title,
    subtitle: typeof publicCall.subtitle === 'string' ? publicCall.subtitle : fallback.subtitle,
    heroDescription:
      typeof publicCall.heroDescription === 'string'
        ? publicCall.heroDescription
        : fallback.heroDescription,
    opensAt: typeof rawSettings.opensAt === 'string' ? rawSettings.opensAt : null,
    closesAt: typeof rawSettings.closesAt === 'string' ? rawSettings.closesAt : null,
    extensionAt: typeof rawSettings.extensionAt === 'string' ? rawSettings.extensionAt : null,
    scheduleStages,
    areaRequirements,
    registrationUrl:
      typeof publicCall.registrationUrl === 'string'
        ? publicCall.registrationUrl
        : fallback.registrationUrl,
    bannerImageUrl:
      typeof publicCall.bannerImageUrl === 'string' ? publicCall.bannerImageUrl : null,
  };
}

/**
 * Obtiene los parámetros públicos de convocatoria desde la tabla singleton `recruitment_config`.
 */
export async function getCallPublicConfig(): Promise<{
  revision: number;
  settings: CmsCallPublicSettings;
  updatedAt: string;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('recruitment_config')
      .select('settings, revision, updated_at')
      .eq('singleton', true)
      .single();

    if (error || !data) {
      console.warn('[CMS Call Service] No se pudo leer recruitment_config. Usando fallback.');
      return {
        revision: 1,
        settings: getCallConfigFallback(),
        updatedAt: new Date().toISOString(),
      };
    }

    const settings = normalizeCallPublicSettings(data.settings as Record<string, unknown>);

    return {
      revision: Number(data.revision) || 1,
      settings,
      updatedAt: data.updated_at || new Date().toISOString(),
    };
  } catch (err: unknown) {
    console.error('[CMS Call Service] Error inesperado al obtener configuración de convocatoria:', err);
    return {
      revision: 1,
      settings: getCallConfigFallback(),
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Actualiza los parámetros públicos de Convocatoria con control de concurrencia optimista (`revision`)
 * y registro obligatorio de auditoría en `recruitment_config_events`.
 * 
 * Preserva 100% intactas las propiedades operativas preexistentes (maxApplicants, questions, etc.).
 */
export async function updateCallPublicConfig(
  input: UpdateCmsCallPublicSettingsInput,
  actor: CmsSessionUser
): Promise<{
  revision: number;
  settings: CmsCallPublicSettings;
  updatedAt: string;
}> {
  // 1. Validación de permisos RBAC
  // Exclusivamente rol 'admin', 'dcc' con scope ALL, o directores con área 'GTH' y capacidad de publicación
  const isAuthorized =
    actor.role === 'admin' ||
    (actor.canPublish && (actor.areaScope === 'ALL' || actor.areaScope === 'GTH'));

  if (!isAuthorized) {
    throw new CmsCallServiceError(
      'FORBIDDEN_AREA',
      'No tienes permisos suficientes para modificar los parámetros de Convocatoria (requiere Admin o Dirección GTH).',
      403
    );
  }

  // 2. Validación de motivo de cambio (auditoría obligatoria)
  if (!input.reason || typeof input.reason !== 'string' || !input.reason.trim()) {
    throw new CmsCallServiceError(
      'VALIDATION_ERROR',
      'Es obligatorio especificar un motivo descriptivo (reason) para la auditoría del cambio.',
      422,
      { field: 'reason' }
    );
  }

  // 3. Lectura de la configuración actual en base de datos
  const { data: currentData, error: readError } = await supabaseAdmin
    .from('recruitment_config')
    .select('settings, revision, updated_at')
    .eq('singleton', true)
    .single();

  if (readError || !currentData) {
    throw new CmsCallServiceError(
      'NOT_FOUND',
      'No se encontró el registro de configuración de convocatoria (recruitment_config).',
      404
    );
  }

  const currentRevision = Number(currentData.revision) || 1;
  const currentSettings = (currentData.settings && typeof currentData.settings === 'object'
    ? { ...currentData.settings }
    : {}) as Record<string, unknown>;

  // 4. Control de concurrencia optimista
  if (input.expectedRevision !== undefined && input.expectedRevision !== currentRevision) {
    throw new CmsCallServiceError(
      'CONCURRENCY_CONFLICT',
      `Conflicto de concurrencia: la configuración fue modificada por otro usuario (revisión actual: ${currentRevision}, versión esperada: ${input.expectedRevision}). Recarga la página antes de continuar.`,
      409,
      { currentRevision, expectedRevision: input.expectedRevision }
    );
  }

  // 5. Fusión segura preservando propiedades operativas existentes
  const nextSettings: Record<string, unknown> = { ...currentSettings };
  const incoming = input.settings || {};

  // Propiedades raíz públicas
  if (incoming.enabled !== undefined) nextSettings.enabled = Boolean(incoming.enabled);
  if (incoming.title !== undefined) nextSettings.title = String(incoming.title).trim();
  if (incoming.opensAt !== undefined) nextSettings.opensAt = incoming.opensAt;
  if (incoming.closesAt !== undefined) nextSettings.closesAt = incoming.closesAt;
  if (incoming.extensionAt !== undefined) nextSettings.extensionAt = incoming.extensionAt;

  // Nodo publicCall
  const currentPublicCall = (currentSettings.publicCall && typeof currentSettings.publicCall === 'object'
    ? currentSettings.publicCall
    : {}) as Record<string, unknown>;

  const nextPublicCall: Record<string, unknown> = {
    ...currentPublicCall,
    subtitle: incoming.subtitle !== undefined ? incoming.subtitle : currentPublicCall.subtitle,
    heroDescription:
      incoming.heroDescription !== undefined ? incoming.heroDescription : currentPublicCall.heroDescription,
    scheduleStages:
      incoming.scheduleStages !== undefined ? incoming.scheduleStages : currentPublicCall.scheduleStages,
    areaRequirements:
      incoming.areaRequirements !== undefined ? incoming.areaRequirements : currentPublicCall.areaRequirements,
    registrationUrl:
      incoming.registrationUrl !== undefined ? incoming.registrationUrl : currentPublicCall.registrationUrl,
    bannerImageUrl:
      incoming.bannerImageUrl !== undefined ? incoming.bannerImageUrl : currentPublicCall.bannerImageUrl,
  };

  nextSettings.publicCall = nextPublicCall;

  // 6. Preparación de payloads limpios para la auditoría (ocultando previewKeyHash)
  const cleanBefore = { ...currentSettings };
  delete cleanBefore.previewKeyHash;

  const cleanAfter = { ...nextSettings };
  delete cleanAfter.previewKeyHash;

  // 7. Registro de auditoría en recruitment_config_events
  const { error: eventError } = await supabaseAdmin.from('recruitment_config_events').insert({
    actor: actor.email || 'administracion',
    kind: 'cms_call_settings',
    before_value: cleanBefore,
    after_value: {
      ...cleanAfter,
      _auditReason: input.reason.trim(),
      _auditActorId: actor.id,
      _auditActorRole: actor.role,
    },
  });

  if (eventError) {
    console.error('[CMS Call Service] Error al registrar evento de auditoría en recruitment_config_events:', eventError);
    // Nota: Dependiendo de la política, se puede continuar o alertar
  }

  // 8. Actualización atómica en recruitment_config
  const nextRevision = currentRevision + 1;
  const now = new Date().toISOString();

  const { error: updateError } = await supabaseAdmin
    .from('recruitment_config')
    .update({
      settings: nextSettings,
      revision: nextRevision,
      updated_at: now,
    })
    .eq('singleton', true);

  if (updateError) {
    console.error('[CMS Call Service] Error al actualizar recruitment_config:', updateError);
    throw new CmsCallServiceError(
      'DATABASE_ERROR',
      `Error de base de datos al guardar la configuración: ${updateError.message}`,
      500
    );
  }

  // 9. Retorno normalizado
  return {
    revision: nextRevision,
    settings: normalizeCallPublicSettings(nextSettings),
    updatedAt: now,
  };
}
