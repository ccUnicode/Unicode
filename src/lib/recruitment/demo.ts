/** Invented records only. Never reads, copies or anonymizes production applications. */
import { AREA_IDS, type RecruitmentApplication, type RecruitmentConfig, type ApplicationStatus } from './types';
import { RecruitmentError } from './validation';

const states: ApplicationStatus[] = ['submitted', 'profile_validated', 'selected', 'not_selected', 'profile_rejected', 'draft', 'incomplete', 'expired'];
export function demoApplications(config: RecruitmentConfig, id?: string) {
  const applications: RecruitmentApplication[] = AREA_IDS.flatMap((area, areaIndex) => states.map((status, index) => {
    const number = areaIndex * states.length + index + 1;
    const createdAt = new Date(Date.UTC(2026, 9, 1 + index, 15, areaIndex)).toISOString();
    const submittedAt = ['draft', 'incomplete', 'expired'].includes(status) ? null : createdAt;
    return {
      id: `dddddddd-dddd-4ddd-8ddd-${String(number).padStart(12, '0')}`, status,
      evaluationChoice: index === 1 ? 2 : 1, evaluationArea: index === 1 ? AREA_IDS[(areaIndex + 1) % AREA_IDS.length] : area,
      data: { firstName: ['Lucía', 'Mateo', 'Valeria', 'Diego', 'Camila', 'Daniel', 'Sofía', 'Alex'][index], lastName: `Ejemplo ${number}`,
        email: `postulante-${number}@example.invalid`, phone: '', university: 'UNI', faculty: 'FIIS', career: 'Ingeniería de Sistemas',
        admissionTerm: '2024-1', semester: '6', firstChoiceArea: area, secondChoiceArea: AREA_IDS[(areaIndex + 1) % AREA_IDS.length],
        availabilityHours: 4 + index, motivation: 'Me gustaría aprender en equipo y participar en proyectos de la comunidad. Esta respuesta es ficticia.',
        shortCase: '', consent: true, showcase: 'Proyecto ficticio de organización de actividades.', organizations: 'Comunidad de ejemplo', referralSource: 'Instagram' },
      questions: config.questions.filter(q => q.enabled !== false).slice(0, 4),
      video: submittedAt ? { provider: 'supabase', fileId: 'demo', uploadId: 'demo', bytes: 0, durationSeconds: 1, contentType: 'video/mp4', verifiedAt: createdAt, mode: 'upload' } : null,
      technicalFailureCount: 0, alternateAllowed: false, recordingAttempts: submittedAt ? 1 : 0,
      createdAt, updatedAt: createdAt, submittedAt,
      history: [{ id: `ejemplo-${number}`, fromStatus: null, toStatus: status, actor: 'Equipo de demostración', reason: 'Registro completamente ficticio para explorar el panel.', createdAt }],
    };
  }));
  if (!id) return { applications };
  const application = applications.find(a => a.id === id);
  if (!application) throw new RecruitmentError('not_found', 'No existe esa postulación de demostración.', 404);
  return { application };
}

export function demoVideo(config: RecruitmentConfig, id: string) {
  if (!demoApplications(config, id).application?.video) throw new RecruitmentError('not_found', 'Este ejemplo no tiene video.', 404);
  return { url: '/demo/recruitment.mp4', embedded: false, durationSeconds: 1 };
}
