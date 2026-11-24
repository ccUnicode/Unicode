/**
 * Validaciones estrictas, sanitización y reglas de transición editorial
 * para la tabla `public.cms_events`.
 */
import {
  CMS_AREA_SCOPES,
  CMS_CONTENT_STATUSES,
  CMS_EVENT_CATEGORIES,
  type CmsActor,
  type CmsAreaScope,
  type CmsAuditAction,
  type CmsContentStatus,
  type CmsEventCategory,
  type CmsEventCreateInput,
  type CmsEventFilters,
  type CmsEventRow,
  type CmsEventStatusTransitionInput,
  type CmsEventUpdateInput,
} from '../../types/cms';
import { CmsError } from './errors';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const TIMEZONE_ISO_REGEX =
  /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2}))$/;

function assertPlainObject(value: unknown, message = 'El cuerpo debe ser un objeto JSON válido.'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CmsError('invalid_body', message, 400);
  }
  return value as Record<string, unknown>;
}

function readRequiredString(
  value: unknown,
  fieldLabel: string,
  maxLength: number,
  fieldKey: string,
): string {
  if (typeof value !== 'string') {
    throw new CmsError(
      'validation_error',
      `El campo ${fieldLabel} es obligatorio y debe ser texto.`,
      400,
      { [fieldKey]: 'Debe ser una cadena de texto no vacía.' },
    );
  }
  const cleaned = value.trim().normalize('NFC');
  if (!cleaned) {
    throw new CmsError(
      'validation_error',
      `El campo ${fieldLabel} es obligatorio.`,
      400,
      { [fieldKey]: 'No puede estar vacío.' },
    );
  }
  if (cleaned.length > maxLength) {
    throw new CmsError(
      'validation_error',
      `El campo ${fieldLabel} no puede exceder ${maxLength} caracteres.`,
      400,
      { [fieldKey]: `Máximo ${maxLength} caracteres.` },
    );
  }
  if (CONTROL_CHARS_REGEX.test(cleaned)) {
    throw new CmsError(
      'validation_error',
      `El campo ${fieldLabel} contiene caracteres de control no permitidos.`,
      400,
      { [fieldKey]: 'Contiene caracteres no permitidos.' },
    );
  }
  return cleaned;
}

function readOptionalString(
  value: unknown,
  fieldLabel: string,
  maxLength: number,
  fieldKey: string,
): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') {
    throw new CmsError(
      'validation_error',
      `El campo ${fieldLabel} debe ser texto o nulo.`,
      400,
      { [fieldKey]: 'Tipo inválido.' },
    );
  }
  const cleaned = value.trim().normalize('NFC');
  if (!cleaned) return null;
  if (cleaned.length > maxLength) {
    throw new CmsError(
      'validation_error',
      `El campo ${fieldLabel} no puede exceder ${maxLength} caracteres.`,
      400,
      { [fieldKey]: `Máximo ${maxLength} caracteres.` },
    );
  }
  if (CONTROL_CHARS_REGEX.test(cleaned)) {
    throw new CmsError(
      'validation_error',
      `El campo ${fieldLabel} contiene caracteres de control no permitidos.`,
      400,
      { [fieldKey]: 'Contiene caracteres no permitidos.' },
    );
  }
  return cleaned;
}

function parseIsoDate(
  value: unknown,
  fieldLabel: string,
  required: boolean,
  fieldKey: string,
): string | null {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new CmsError(
        'validation_error',
        `El campo ${fieldLabel} es obligatorio.`,
        400,
        { [fieldKey]: 'Fecha requerida en formato ISO-8601.' },
      );
    }
    return null;
  }
  if (typeof value !== 'string') {
    throw new CmsError(
      'validation_error',
      `El campo ${fieldLabel} debe ser una fecha ISO-8601 válida.`,
      400,
      { [fieldKey]: 'Formato de fecha inválido.' },
    );
  }
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) {
      throw new CmsError(
        'validation_error',
        `El campo ${fieldLabel} es obligatorio.`,
        400,
        { [fieldKey]: 'No puede estar vacío.' },
      );
    }
    return null;
  }

  // Acepta ISO-8601 con zona horaria o timestamp estándar parseable por Date.parse
  const parsedMs = Date.parse(trimmed);
  if (!Number.isFinite(parsedMs) || (!TIMEZONE_ISO_REGEX.test(trimmed) && Number.isNaN(parsedMs))) {
    throw new CmsError(
      'validation_error',
      `El campo ${fieldLabel} debe tener un formato ISO-8601 válido.`,
      400,
      { [fieldKey]: 'Formato ISO-8601 inválido.' },
    );
  }
  return new Date(parsedMs).toISOString();
}

export function validateUuid(value: unknown, fieldLabel = 'id'): string {
  if (typeof value !== 'string' || !UUID_REGEX.test(value.trim())) {
    throw new CmsError(
      'invalid_id',
      `El identificador (${fieldLabel}) no tiene formato UUID válido.`,
      400,
    );
  }
  return value.trim().toLowerCase();
}

export function generateEventSlug(title: string): string {
  const normalized = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160)
    .replace(/-+$/g, '');

  if (!normalized || !SLUG_REGEX.test(normalized)) {
    throw new CmsError(
      'validation_error',
      'No se pudo autogenerar un slug válido a partir del título; proporciona un slug en formato kebab-case.',
      400,
      { slug: 'Slug inválido.' },
    );
  }

  return normalized;
}

function validateSlugValue(rawSlug: unknown, fallbackTitle?: string): string {
  if (rawSlug === undefined || rawSlug === null || (typeof rawSlug === 'string' && !rawSlug.trim())) {
    if (fallbackTitle) return generateEventSlug(fallbackTitle);
    throw new CmsError('validation_error', 'El slug no puede estar vacío.', 400, {
      slug: 'Slug requerido.',
    });
  }
  if (typeof rawSlug !== 'string') {
    throw new CmsError('validation_error', 'El slug debe ser una cadena de texto.', 400, {
      slug: 'Debe ser texto.',
    });
  }
  const cleaned = rawSlug.trim().toLowerCase();
  if (cleaned.length > 160 || !SLUG_REGEX.test(cleaned)) {
    throw new CmsError(
      'validation_error',
      'El slug debe estar en formato kebab-case (solo minúsculas, números y guiones) y tener máximo 160 caracteres.',
      400,
      { slug: 'Formato kebab-case inválido.' },
    );
  }
  return cleaned;
}

export function validateSafeUrl(
  value: unknown,
  fieldLabel: string,
  required: boolean,
  fieldKey = 'url',
): string | null {
  if (value === undefined || value === null) {
    if (required) {
      throw new CmsError(
        'validation_error',
        `El campo ${fieldLabel} es obligatorio.`,
        400,
        { [fieldKey]: 'URL o ruta obligatoria.' },
      );
    }
    return null;
  }

  if (typeof value !== 'string') {
    throw new CmsError(
      'validation_error',
      `El campo ${fieldLabel} debe ser una URL válida.`,
      400,
      { [fieldKey]: 'Debe ser texto.' },
    );
  }

  const cleaned = value.trim();
  if (!cleaned) {
    if (required) {
      throw new CmsError(
        'validation_error',
        `El campo ${fieldLabel} es obligatorio.`,
        400,
        { [fieldKey]: 'No puede estar vacío.' },
      );
    }
    return null;
  }

  if (cleaned.length > 2048 || /[\u0000-\u0020\u007f]/.test(cleaned)) {
    throw new CmsError(
      'validation_error',
      `El campo ${fieldLabel} contiene espacios o caracteres no permitidos.`,
      400,
      { [fieldKey]: 'URL insegura o malformada.' },
    );
  }

  if (cleaned.startsWith('/')) {
    if (cleaned.startsWith('//')) {
      throw new CmsError(
        'validation_error',
        `El campo ${fieldLabel} no puede iniciar con '//'.`,
        400,
        { [fieldKey]: 'Ruta relativa inválida.' },
      );
    }
    return cleaned;
  }

  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    throw new CmsError(
      'validation_error',
      `El campo ${fieldLabel} debe ser una URL https://, http:// o una ruta relativa '/...'.`,
      400,
      { [fieldKey]: 'URL inválida.' },
    );
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new CmsError(
      'validation_error',
      `El campo ${fieldLabel} utiliza un protocolo no permitido (${parsed.protocol}). Solo se acepta https://, http:// o ruta relativa '/...'.`,
      400,
      { [fieldKey]: 'Protocolo no permitido.' },
    );
  }

  return cleaned;
}

function validateCategory(value: unknown): CmsEventCategory {
  if (
    typeof value !== 'string' ||
    !(CMS_EVENT_CATEGORIES as readonly string[]).includes(value.trim())
  ) {
    throw new CmsError(
      'validation_error',
      `Categoría inválida. Valores permitidos: ${CMS_EVENT_CATEGORIES.join(', ')}.`,
      400,
      { category: 'Categoría fuera del catálogo oficial.' },
    );
  }
  return value.trim() as CmsEventCategory;
}

function validateAreaScope(value: unknown): CmsAreaScope {
  if (typeof value !== 'string') {
    throw new CmsError(
      'validation_error',
      `El área (area_scope) es obligatoria. Valores permitidos: ${CMS_AREA_SCOPES.join(', ')}.`,
      400,
      { area_scope: 'Área inválida.' },
    );
  }
  const normalized = value.trim().toUpperCase();
  if (!(CMS_AREA_SCOPES as readonly string[]).includes(normalized)) {
    throw new CmsError(
      'validation_error',
      `Área inválida (${value}). Valores permitidos: ${CMS_AREA_SCOPES.join(', ')}.`,
      400,
      { area_scope: 'Sigla de área no reconocida.' },
    );
  }
  return normalized as CmsAreaScope;
}

function validateContentStatus(value: unknown): CmsContentStatus {
  if (
    typeof value !== 'string' ||
    !(CMS_CONTENT_STATUSES as readonly string[]).includes(value.trim())
  ) {
    throw new CmsError(
      'validation_error',
      `Estado editorial inválido. Valores permitidos: ${CMS_CONTENT_STATUSES.join(', ')}.`,
      400,
      { status: 'Estado editorial inválido.' },
    );
  }
  return value.trim() as CmsContentStatus;
}

function validateAttendeesCount(value: unknown): number {
  if (value === undefined || value === null) return 0;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new CmsError(
      'validation_error',
      'El campo attendees_count debe ser un número entero mayor o igual a 0.',
      400,
      { attendees_count: 'Debe ser entero >= 0.' },
    );
  }
  return value;
}

function validateHighlights(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new CmsError(
      'validation_error',
      'El campo highlights debe ser un arreglo de textos.',
      400,
      { highlights: 'Debe ser un arreglo.' },
    );
  }
  if (value.length > 20) {
    throw new CmsError(
      'validation_error',
      'El campo highlights admite como máximo 20 etiquetas.',
      400,
      { highlights: 'Máximo 20 etiquetas.' },
    );
  }
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      throw new CmsError(
        'validation_error',
        'Cada elemento de highlights debe ser texto.',
        400,
        { highlights: 'Elementos inválidos.' },
      );
    }
    const text = item.trim().normalize('NFC');
    if (!text) continue;
    if (text.length > 60 || CONTROL_CHARS_REGEX.test(text)) {
      throw new CmsError(
        'validation_error',
        'Cada etiqueta de highlights debe tener como máximo 60 caracteres válidos.',
        400,
        { highlights: 'Etiqueta demasiado larga o con caracteres no permitidos.' },
      );
    }
    if (!seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      cleaned.push(text);
    }
  }
  return cleaned;
}

function validateBooleanField(value: unknown, fieldLabel: string, defaultValue: boolean, fieldKey: string): boolean {
  if (value === undefined) return defaultValue;
  if (typeof value !== 'boolean') {
    throw new CmsError(
      'validation_error',
      `El campo ${fieldLabel} debe ser booleano (true/false).`,
      400,
      { [fieldKey]: 'Debe ser booleano.' },
    );
  }
  return value;
}

function assertDateRange(eventDate: string, endDate: string | null): void {
  if (endDate && Date.parse(endDate) < Date.parse(eventDate)) {
    throw new CmsError(
      'validation_error',
      'La fecha de fin (end_date) debe ser mayor o igual a la fecha de inicio (event_date).',
      400,
      { end_date: 'Debe ser >= event_date.' },
    );
  }
}

export function validateCreateEventInput(input: unknown): CmsEventCreateInput {
  const source = assertPlainObject(input);

  const title = readRequiredString(source.title, 'título (title)', 200, 'title');
  const description = readRequiredString(source.description, 'descripción (description)', 10_000, 'description');
  const event_date = parseIsoDate(source.event_date, 'fecha del evento (event_date)', true, 'event_date')!;
  const end_date = parseIsoDate(source.end_date, 'fecha de fin (end_date)', false, 'end_date');
  assertDateRange(event_date, end_date);

  const location = readRequiredString(source.location, 'ubicación (location)', 150, 'location');
  const category = validateCategory(source.category);
  const area_scope = validateAreaScope(source.area_scope);
  const thumbnail_url = validateSafeUrl(
    source.thumbnail_url,
    'miniatura (thumbnail_url)',
    true,
    'thumbnail_url',
  )!;

  const slug = validateSlugValue(source.slug, title);
  const summary = readOptionalString(source.summary, 'resumen (summary)', 500, 'summary');
  const display_date = readOptionalString(source.display_date, 'fecha legible (display_date)', 80, 'display_date');
  const time_range = readOptionalString(source.time_range, 'horario (time_range)', 80, 'time_range');
  const speaker = readOptionalString(source.speaker, 'ponente (speaker)', 200, 'speaker');
  const speaker_image_url = validateSafeUrl(
    source.speaker_image_url,
    'imagen de ponente (speaker_image_url)',
    false,
    'speaker_image_url',
  );
  const background_image_url = validateSafeUrl(
    source.background_image_url,
    'imagen de fondo (background_image_url)',
    false,
    'background_image_url',
  );
  const external_url = validateSafeUrl(
    source.external_url,
    'enlace externo (external_url)',
    false,
    'external_url',
  );
  const attendees_count = validateAttendeesCount(source.attendees_count);
  const highlights = validateHighlights(source.highlights);
  const is_featured = validateBooleanField(source.is_featured, 'is_featured', false, 'is_featured');
  const status = source.status === undefined ? 'draft' : validateContentStatus(source.status);

  return {
    slug,
    title,
    summary,
    description,
    event_date,
    end_date,
    display_date,
    time_range,
    location,
    category,
    area_scope,
    speaker,
    speaker_image_url,
    thumbnail_url,
    background_image_url,
    external_url,
    attendees_count,
    highlights,
    is_featured,
    status,
  };
}

export function validateUpdateEventInput(
  input: unknown,
  existing?: Pick<CmsEventRow, 'event_date' | 'end_date'>,
): CmsEventUpdateInput {
  const source = assertPlainObject(input);

  if (Object.hasOwn(source, 'status')) {
    throw new CmsError(
      'validation_error',
      'El estado editorial no se actualiza por este endpoint; utiliza PATCH /api/cms/events/:id/status.',
      400,
      { status: 'Usa el endpoint dedicado /status.' },
    );
  }

  const patch: CmsEventUpdateInput = {};

  if (Object.hasOwn(source, 'slug')) {
    patch.slug = validateSlugValue(source.slug);
  }
  if (Object.hasOwn(source, 'title')) {
    patch.title = readRequiredString(source.title, 'título (title)', 200, 'title');
  }
  if (Object.hasOwn(source, 'summary')) {
    patch.summary = readOptionalString(source.summary, 'resumen (summary)', 500, 'summary');
  }
  if (Object.hasOwn(source, 'description')) {
    patch.description = readRequiredString(source.description, 'descripción (description)', 10_000, 'description');
  }
  if (Object.hasOwn(source, 'event_date')) {
    patch.event_date = parseIsoDate(source.event_date, 'fecha del evento (event_date)', true, 'event_date')!;
  }
  if (Object.hasOwn(source, 'end_date')) {
    patch.end_date = parseIsoDate(source.end_date, 'fecha de fin (end_date)', false, 'end_date');
  }
  if (Object.hasOwn(source, 'display_date')) {
    patch.display_date = readOptionalString(source.display_date, 'fecha legible (display_date)', 80, 'display_date');
  }
  if (Object.hasOwn(source, 'time_range')) {
    patch.time_range = readOptionalString(source.time_range, 'horario (time_range)', 80, 'time_range');
  }
  if (Object.hasOwn(source, 'location')) {
    patch.location = readRequiredString(source.location, 'ubicación (location)', 150, 'location');
  }
  if (Object.hasOwn(source, 'category')) {
    patch.category = validateCategory(source.category);
  }
  if (Object.hasOwn(source, 'area_scope')) {
    patch.area_scope = validateAreaScope(source.area_scope);
  }
  if (Object.hasOwn(source, 'speaker')) {
    patch.speaker = readOptionalString(source.speaker, 'ponente (speaker)', 200, 'speaker');
  }
  if (Object.hasOwn(source, 'speaker_image_url')) {
    patch.speaker_image_url = validateSafeUrl(
      source.speaker_image_url,
      'imagen de ponente (speaker_image_url)',
      false,
      'speaker_image_url',
    );
  }
  if (Object.hasOwn(source, 'thumbnail_url')) {
    patch.thumbnail_url = validateSafeUrl(
      source.thumbnail_url,
      'miniatura (thumbnail_url)',
      true,
      'thumbnail_url',
    )!;
  }
  if (Object.hasOwn(source, 'background_image_url')) {
    patch.background_image_url = validateSafeUrl(
      source.background_image_url,
      'imagen de fondo (background_image_url)',
      false,
      'background_image_url',
    );
  }
  if (Object.hasOwn(source, 'external_url')) {
    patch.external_url = validateSafeUrl(
      source.external_url,
      'enlace externo (external_url)',
      false,
      'external_url',
    );
  }
  if (Object.hasOwn(source, 'attendees_count')) {
    patch.attendees_count = validateAttendeesCount(source.attendees_count);
  }
  if (Object.hasOwn(source, 'highlights')) {
    patch.highlights = validateHighlights(source.highlights);
  }
  if (Object.hasOwn(source, 'is_featured')) {
    patch.is_featured = validateBooleanField(source.is_featured, 'is_featured', false, 'is_featured');
  }

  if (Object.keys(patch).length === 0) {
    throw new CmsError(
      'validation_error',
      'Debes enviar al menos un campo editable válido para actualizar.',
      400,
    );
  }

  const effectiveEventDate = patch.event_date ?? existing?.event_date;
  const effectiveEndDate = patch.end_date !== undefined ? patch.end_date : existing?.end_date ?? null;
  if (effectiveEventDate && effectiveEndDate) {
    assertDateRange(effectiveEventDate, effectiveEndDate);
  }

  return patch;
}

export function validateEventFilters(
  raw: URLSearchParams | Record<string, unknown>,
): CmsEventFilters {
  const getParam = (key: string): unknown =>
    raw instanceof URLSearchParams ? raw.get(key) ?? undefined : raw[key];

  const statusRaw = getParam('status');
  const categoryRaw = getParam('category');
  const areaRaw = getParam('area_scope');
  const featuredRaw = getParam('is_featured');
  const searchRaw = getParam('search');
  const pageRaw = getParam('page');
  const pageSizeRaw = getParam('pageSize');

  const filters: CmsEventFilters = {
    page: 1,
    pageSize: 20,
  };

  if (statusRaw !== undefined && statusRaw !== '') {
    filters.status = validateContentStatus(statusRaw);
  }

  if (categoryRaw !== undefined && categoryRaw !== '') {
    filters.category = validateCategory(categoryRaw);
  }

  if (areaRaw !== undefined && areaRaw !== '') {
    filters.area_scope = validateAreaScope(areaRaw);
  }

  if (featuredRaw !== undefined && featuredRaw !== '') {
    if (featuredRaw === true || featuredRaw === 'true') filters.is_featured = true;
    else if (featuredRaw === false || featuredRaw === 'false') filters.is_featured = false;
    else {
      throw new CmsError(
        'validation_error',
        'El filtro is_featured debe ser true o false.',
        400,
        { is_featured: 'Valor booleano inválido.' },
      );
    }
  }

  if (searchRaw !== undefined && searchRaw !== '') {
    if (typeof searchRaw !== 'string') {
      throw new CmsError('validation_error', 'El filtro search debe ser texto.', 400);
    }
    const cleaned = searchRaw.trim().normalize('NFC');
    if (cleaned.length > 120 || CONTROL_CHARS_REGEX.test(cleaned)) {
      throw new CmsError(
        'validation_error',
        'El término de búsqueda no puede exceder 120 caracteres ni contener caracteres de control.',
        400,
      );
    }
    if (cleaned) filters.search = cleaned;
  }

  if (pageRaw !== undefined && pageRaw !== '') {
    const pageNum = typeof pageRaw === 'number' ? pageRaw : Number(pageRaw);
    if (!Number.isInteger(pageNum) || pageNum < 1) {
      throw new CmsError('validation_error', 'El parámetro page debe ser un entero >= 1.', 400, {
        page: 'Entero >= 1.',
      });
    }
    filters.page = pageNum;
  }

  if (pageSizeRaw !== undefined && pageSizeRaw !== '') {
    const pageSizeNum = typeof pageSizeRaw === 'number' ? pageSizeRaw : Number(pageSizeRaw);
    if (!Number.isInteger(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100) {
      throw new CmsError(
        'validation_error',
        'El parámetro pageSize debe ser un entero entre 1 y 100.',
        400,
        { pageSize: 'Entero entre 1 y 100.' },
      );
    }
    filters.pageSize = pageSizeNum;
  }

  return filters;
}

export function validateStatusTransitionInput(input: unknown): CmsEventStatusTransitionInput {
  const source = assertPlainObject(input);
  const status = validateContentStatus(source.status);
  const review_comment = readOptionalString(
    source.review_comment,
    'comentario de revisión (review_comment)',
    1000,
    'review_comment',
  );
  return {
    status,
    ...(review_comment ? { review_comment } : {}),
  };
}

const ALLOWED_STATUS_TRANSITIONS: Record<CmsContentStatus, readonly CmsContentStatus[]> = {
  draft: ['pending_review', 'published', 'archived'],
  pending_review: ['draft', 'published', 'archived'],
  published: ['draft', 'archived'],
  archived: ['draft', 'published'],
};

export function resolveEditorialTransition(
  actor: CmsActor,
  fromStatus: CmsContentStatus,
  toStatus: CmsContentStatus,
): CmsAuditAction {
  if (fromStatus === toStatus) {
    throw new CmsError(
      'invalid_transition',
      `El evento ya se encuentra en estado '${toStatus}'.`,
      400,
    );
  }

  if (actor.role === 'delegate') {
    if (fromStatus === 'published' || fromStatus === 'archived') {
      throw new CmsError(
        'forbidden',
        'Un delegado no puede modificar ni cambiar el estado de un evento publicado o archivado.',
        403,
      );
    }
    if (toStatus === 'published' || toStatus === 'archived') {
      throw new CmsError(
        'forbidden',
        'Un delegado no tiene permisos para publicar o archivar eventos; envíalo a revisión (pending_review).',
        403,
      );
    }
  }

  if (!ALLOWED_STATUS_TRANSITIONS[fromStatus].includes(toStatus)) {
    throw new CmsError(
      'invalid_transition',
      `Transición editorial no permitida de '${fromStatus}' a '${toStatus}'.`,
      400,
    );
  }

  if (toStatus === 'pending_review') return 'submit_review';
  if (toStatus === 'published') return 'approve_publish';
  if (toStatus === 'archived') return 'archive';
  if (fromStatus === 'archived' && toStatus === 'draft') return 'restore';
  return 'reject_to_draft';
}
