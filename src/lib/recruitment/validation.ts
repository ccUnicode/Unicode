import { AREA_IDS, AREA_NAMES, type ApplicationData, type EmailTemplate, type RecruitmentConfig, type RecruitmentQuestion } from './types';

export class RecruitmentError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RecruitmentError('invalid_body', 'Solicitud inválida.');
  return value as Record<string, unknown>;
}
function string(value: unknown, field: string, maximum: number, allowEmpty = true): string {
  if (typeof value !== 'string') throw new RecruitmentError('invalid_field', `El campo ${field} debe ser texto.`);
  const cleaned = value.trim().normalize('NFC');
  if (cleaned.length > maximum || (!allowEmpty && !cleaned)) throw new RecruitmentError('invalid_field', `Revisa el campo ${field}.`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(cleaned)) throw new RecruitmentError('invalid_field', `El campo ${field} contiene caracteres no permitidos.`);
  return cleaned;
}
function number(value: unknown, field: string, min: number, max: number, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new RecruitmentError('invalid_field', `Revisa el valor de ${field}.`);
  }
  return value;
}
function boolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') throw new RecruitmentError('invalid_field', `Revisa el valor de ${field}.`);
  return value;
}
function date(value: unknown, field: string): string | null {
  if (value === null) return null;
  const text = string(value, field, 60, false);
  if (!/T.*(?:Z|[+-]\d\d:\d\d)$/.test(text) || !Number.isFinite(Date.parse(text))) throw new RecruitmentError('invalid_field', `${field} debe incluir su zona horaria.`);
  return new Date(text).toISOString();
}
export const emptyApplicationData: ApplicationData = {
  firstName: '', lastName: '', email: '', phone: '', university: '', faculty: '', career: '', admissionTerm: '', semester: '',
  firstChoiceArea: '', secondChoiceArea: '', availabilityHours: null, motivation: '', shortCase: '', consent: false, showcase: '', organizations: '', referralSource: '',
};
export function validateApplicationData(input: unknown, existing: ApplicationData = emptyApplicationData, creating = false): ApplicationData {
  const source = { ...existing, ...record(input) };
  const result: ApplicationData = {
    firstName: string(source.firstName, 'nombres', 150), lastName: string(source.lastName, 'apellidos', 150),
    email: string(source.email, 'correo', 254).toLowerCase(), phone: string(source.phone, 'teléfono', 30).replace(/[\s().-]/g, ''),
    university: string(source.university, 'centro de estudios', 150), faculty: string(source.faculty, 'facultad', 150),
    career: string(source.career, 'carrera', 150), admissionTerm: string(source.admissionTerm, 'periodo de ingreso', 20),
    semester: string(source.semester, 'ciclo', 2), firstChoiceArea: string(source.firstChoiceArea, 'primera área', 10) as ApplicationData['firstChoiceArea'],
    secondChoiceArea: string(source.secondChoiceArea, 'segunda área', 10) as ApplicationData['secondChoiceArea'],
    availabilityHours: source.availabilityHours === null ? null : number(source.availabilityHours, 'disponibilidad semanal', 0, 168),
    motivation: string(source.motivation, 'motivación', 4000), shortCase: string(source.shortCase, 'caso corto', 4000), consent: boolean(source.consent, 'consentimiento'),
    showcase: string(source.showcase ?? '', 'algo que hayas hecho', 2000), organizations: string(source.organizations ?? '', 'otras organizaciones', 2000),
    referralSource: string(source.referralSource ?? '', 'cómo te enteraste', 300),
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new RecruitmentError('invalid_email', 'Escribe un correo electrónico válido.');
  if (result.phone && !/^\d{9}$/.test(result.phone)) throw new RecruitmentError('invalid_phone', 'El teléfono debe contener 9 dígitos.');
  if (result.semester && !/^(?:[0-9]|10)$/.test(result.semester)) throw new RecruitmentError('invalid_semester', 'El ciclo debe estar entre 0 y 10.');
  if (result.admissionTerm && !/^\d{4}-[12]$/.test(result.admissionTerm)) throw new RecruitmentError('invalid_admission', 'El periodo de ingreso debe tener el formato 2026-2.');
  if (result.firstChoiceArea && !(AREA_IDS as readonly string[]).includes(result.firstChoiceArea)) throw new RecruitmentError('invalid_area', 'Área inválida.');
  if (result.secondChoiceArea && (!(AREA_IDS as readonly string[]).includes(result.secondChoiceArea) || result.firstChoiceArea === result.secondChoiceArea)) throw new RecruitmentError('invalid_area', 'Elige áreas diferentes.');
  if (creating && (!result.firstName || !result.lastName || !result.consent)) throw new RecruitmentError('incomplete', 'Se requieren nombres, apellidos, correo y consentimiento para guardar el borrador.');
  return result;
}
export function validateConfig(input: unknown): RecruitmentConfig {
  const source = record(input);
  if (!Array.isArray(source.areas) || source.areas.length !== AREA_IDS.length) throw new RecruitmentError('configuration', `Configura las ${AREA_IDS.length} áreas.`);
  const areas = source.areas.map((value) => {
    const area = record(value); const id = string(area.id, 'área', 10) as typeof AREA_IDS[number];
    if (!(AREA_IDS as readonly string[]).includes(id)) throw new RecruitmentError('configuration', 'Área desconocida.');
    return { id, name: string(area.name, 'nombre del área', 150, false), enabled: boolean(area.enabled, 'área habilitada'), quota: area.quota === null ? null : number(area.quota, 'cupos de integrantes', 0, 150, true) };
  });
  if (new Set(areas.map((area) => area.id)).size !== AREA_IDS.length) throw new RecruitmentError('configuration', 'Las áreas no pueden repetirse.');
  if (!Array.isArray(source.questions) || source.questions.length > 100) throw new RecruitmentError('configuration', 'Revisa el banco de preguntas.');
  const questions: RecruitmentQuestion[] = source.questions.map((value) => {
    const question = record(value); const category = string(question.category, 'categoría', 20);
    if (!['motivation', 'collaboration'].includes(category)) throw new RecruitmentError('configuration', 'Categoría de pregunta desconocida.');
    const id = string(question.id, 'ID de pregunta', 80, false);
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new RecruitmentError('configuration', 'El ID de pregunta solo admite letras, números, guiones y guiones bajos.');
    return { id, category: category as RecruitmentQuestion['category'], text: string(question.text, 'pregunta', 2000, false), enabled: boolean(question.enabled, 'pregunta habilitada') };
  });
  if (new Set(questions.map((question) => question.id)).size !== questions.length) throw new RecruitmentError('configuration', 'Los IDs de preguntas no pueden repetirse.');
  for (const category of ['motivation', 'collaboration']) {
    if (questions.filter((question) => question.category === category && question.enabled).length < 2) throw new RecruitmentError('configuration', 'Habilita al menos dos preguntas en cada categoría.');
  }
  const thresholds = record(source.thresholds);
  if (!Array.isArray(source.videoRubric) || source.videoRubric.length !== 3) throw new RecruitmentError('configuration', 'Configura los tres criterios de la rúbrica del video.');
  const videoRubric = source.videoRubric.map((value) => {
    const criterion = record(value);
    return { id: string(criterion.id, 'ID de criterio', 80, false), label: string(criterion.label, 'criterio', 150, false), low: string(criterion.low, 'nivel bajo', 2000, false), medium: string(criterion.medium, 'nivel medio', 2000, false), high: string(criterion.high, 'nivel alto', 2000, false), maxScore: number(criterion.maxScore, 'puntaje máximo', 5, 5, true) };
  });
  if (new Set(videoRubric.map((criterion) => criterion.id)).size !== 3) throw new RecruitmentError('configuration', 'Los IDs de criterios no pueden repetirse.');
  const result: RecruitmentConfig = {
    enabled: boolean(source.enabled, 'convocatoria habilitada'), title: string(source.title, 'título', 150, false),
    opensAt: date(source.opensAt, 'apertura'), closesAt: date(source.closesAt, 'cierre'), extensionAt: date(source.extensionAt, 'prórroga'),
    maxApplicants: number(source.maxApplicants, 'máximo de postulantes', 1, 150, true), areas,
    // No minimum by default: 0 keeps the database rule satisfied without filtering anyone.
    minAvailabilityHours: source.minAvailabilityHours === null || source.minAvailabilityHours === undefined ? 0 : number(source.minAvailabilityHours, 'disponibilidad mínima', 0, 168),
    maxVideoSeconds: number(source.maxVideoSeconds, 'duración del video', 210, 210, true),
    maxVideoBytes: number(source.maxVideoBytes, 'tamaño del video', 1024 * 1024, 50 * 1024 * 1024, true),
    questionsPerCategory: number(source.questionsPerCategory, 'preguntas por categoría', 2, 2, true),
    preparationSeconds: number(source.preparationSeconds, 'preparación', 0, 300, true), inactivityHours: number(source.inactivityHours, 'inactividad', 1, 720, true),
    shortCasePrompt: string(source.shortCasePrompt, 'caso corto', 2000, false),
    storageProvider: source.storageProvider === 'drive' || source.storageProvider === 'supabase' ? source.storageProvider : (() => { throw new RecruitmentError('configuration', 'Proveedor de videos inválido.'); })(),
    thresholds: { affinity: thresholds.affinity === null ? null : number(thresholds.affinity, 'umbral de afinidad', 0, 100), written: thresholds.written === null ? null : number(thresholds.written, 'umbral escrito', 0, 100), video: thresholds.video === null ? null : number(thresholds.video, 'umbral de video', 0, 15) },
    questions, videoRubric, revision: number(source.revision, 'versión', 1, Number.MAX_SAFE_INTEGER, true),
  };
  if (result.opensAt && result.closesAt && result.opensAt >= result.closesAt) throw new RecruitmentError('configuration', 'El cierre debe ser posterior a la apertura.');
  if (result.extensionAt && (!result.closesAt || result.extensionAt < result.closesAt)) throw new RecruitmentError('configuration', 'La prórroga debe ser igual o posterior al cierre.');
  if (result.enabled && (!result.opensAt || !result.closesAt || !areas.some((area) => area.enabled))) throw new RecruitmentError('configuration', 'Define fechas y al menos un área antes de abrir.');
  return result;
}
export function validateTemplates(input: unknown): EmailTemplate[] {
  const source = record(input);
  if (!Array.isArray(source.templates) || source.templates.length > 30) throw new RecruitmentError('invalid_template', 'Lista de plantillas inválida.');
  return source.templates.map((value) => {
    const template = record(value);
    const result = { key: string(template.key, 'plantilla', 80, false), subject: string(template.subject, 'asunto', 200, false), body: string(template.body, 'mensaje', 10000, false), enabled: boolean(template.enabled, 'plantilla habilitada') };
    if (/[\r\n]/.test(result.subject)) throw new RecruitmentError('invalid_template', 'El asunto no debe contener saltos de línea.');
    for (const match of `${result.subject} ${result.body}`.matchAll(/{{\s*([^}]+)\s*}}/g)) {
      const name = match[1].trim();
      if (!['firstName', 'lastName', 'title', 'status', 'resumeUrl'].includes(name)) throw new RecruitmentError('invalid_template', `Variable desconocida: ${name}.`);
      if (name === 'resumeUrl' && !['resume', 'incomplete'].includes(result.key)) throw new RecruitmentError('invalid_template', 'El enlace personal solo está disponible en las plantillas de borrador.');
    }
    return result;
  });
}

/** Configs saved before an area existed (e.g. FIN) get it appended, enabled, with the default name. */
export function withAllAreas<T extends { areas: { id: string; name: string; enabled: boolean; quota: number | null }[] }>(config: T): T {
  const missing = AREA_IDS.filter((id) => !config.areas.some((area) => area.id === id));
  return missing.length ? { ...config, areas: [...config.areas, ...missing.map((id) => ({ id, name: AREA_NAMES[id], enabled: true, quota: null }))] } : config;
}
