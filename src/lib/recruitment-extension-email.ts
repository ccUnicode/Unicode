import type { ApplicationData, RecruitmentArea } from './recruitment/types';

/** Pending steps use saved server data; optional fields never block an application. */
export function extensionPendingSteps({ data, hasVideo, minAvailabilityHours = 0, areas }: {
  data: Partial<ApplicationData>; hasVideo: boolean; minAvailabilityHours?: number | null;
  areas?: RecruitmentArea[];
}): string[] {
  const required: [keyof ApplicationData, string][] = [
    ['firstName', 'nombres'], ['lastName', 'apellidos'], ['email', 'correo'],
    ['phone', 'teléfono'], ['university', 'centro de estudios'], ['career', 'carrera'],
    ['admissionTerm', 'periodo de ingreso'], ['semester', 'ciclo'],
    ['firstChoiceArea', 'primera opción de área'], ['motivation', 'motivación'],
  ];
  const missing = required.filter(([key]) => !String(data[key] ?? '').trim()).map(([, label]) => label);
  if (typeof data.availabilityHours !== 'number' || !Number.isFinite(data.availabilityHours)
    || data.availabilityHours < (minAvailabilityHours ?? 0)) missing.push('disponibilidad semanal');
  if (!data.consent) missing.push('consentimiento para el uso de tus datos');
  const steps: string[] = [];
  if (missing.length) steps.push(`Completa tus datos pendientes: ${missing.join(', ')}.`);
  if (areas && [data.firstChoiceArea, data.secondChoiceArea].some(id => id && !areas.some(area => area.id === id && area.enabled))) {
    steps.push('Revisa tus opciones de área y elige entre las que están habilitadas.');
  }
  if (!hasVideo) steps.push('Completa y guarda tu video de postulación. Si ya lo grabaste, vuelve desde el mismo navegador para continuar con la carga.');
  const finalAnswers: [keyof ApplicationData, string][] = [
    ['showcase', 'algo que hayas hecho'], ['organizations', 'tu participación en otras organizaciones'],
    ['referralSource', 'cómo te enteraste de la convocatoria'],
  ];
  const missingAnswers = finalAnswers.filter(([key]) => !String(data[key] ?? '').trim()).map(([, label]) => label);
  if (missingAnswers.length) steps.push(`Completa las respuestas finales pendientes: ${missingAnswers.join(', ')}.`);
  steps.push('Confirma el envío de tu postulación al finalizar.');
  return steps;
}

export function extensionEmailText({ firstName, steps, resumeUrl, deadlineLabel }: {
  firstName: string; steps: string[]; resumeUrl: string; deadlineLabel: string;
}): string {
  return `Hola, ${firstName.trim() || 'postulante'}:\n\n¡La convocatoria de UNICODE ha sido ampliada! Ya puedes continuar con tu postulación. Lo que avanzaste sigue guardado.\n\nTienes hasta el ${deadlineLabel} (hora de Lima) para completar y enviar tu postulación.\n\nSegún tu avance guardado, te falta:\n${steps.map(step => `• ${step}`).join('\n')}\n\nContinúa tu postulación desde aquí:\n${resumeUrl}\n\nSi necesitas ayuda para continuar, responde a este correo.\n\nEquipo UNICODE`;
}
