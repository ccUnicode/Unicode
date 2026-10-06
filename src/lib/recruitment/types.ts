export const AREA_IDS = ['ID', 'RRPP', 'GTH', 'ACD', 'DCC', 'LGE', 'FIN'] as const;
/** Default names; FIN only appears in the application form, not in the landing page icons. */
export const AREA_NAMES: Record<string, string> = {
  ID: 'Investigación y Desarrollo', RRPP: 'Relaciones Públicas', GTH: 'Gestión del Talento Humano', ACD: 'Académica',
  DCC: 'Dirección de Comunicación y Contenido', LGE: 'Logística y Gestión de Eventos', FIN: 'Finanzas',
};
export type AreaId = typeof AREA_IDS[number];
export type QuestionCategory = 'motivation' | 'collaboration';
export interface RecruitmentQuestion { id: string; category: QuestionCategory; text: string; enabled?: boolean }
export interface RecruitmentArea { id: AreaId; name: string; enabled: boolean; quota: number | null }
export interface VideoRubricCriterion { id: string; label: string; low: string; medium: string; high: string; maxScore: number }
export interface RecruitmentConfig {
  enabled: boolean; title: string; opensAt: string | null; closesAt: string | null; extensionAt: string | null;
  emailPausedUntil?: string | null;
  maxApplicants: number; areas: RecruitmentArea[]; minAvailabilityHours: number | null;
  maxVideoSeconds: number; maxVideoBytes: number; questionsPerCategory: number; preparationSeconds: number;
  inactivityHours: number; shortCasePrompt: string; storageProvider: 'drive' | 'supabase';
  thresholds: { affinity: number | null; written: number | null; video: number | null };
  questions: RecruitmentQuestion[]; videoRubric: VideoRubricCriterion[]; revision: number;
}
export interface ApplicationData {
  firstName: string; lastName: string; email: string; phone: string; university: string; faculty: string; career: string; admissionTerm: string;
  semester: string; firstChoiceArea: AreaId | ''; secondChoiceArea: AreaId | '';
  availabilityHours: number | null; motivation: string; shortCase: string; consent: boolean;
  showcase: string; organizations: string; referralSource: string;
}
export type ApplicationStatus = 'draft' | 'incomplete' | 'expired' | 'submitted' | 'profile_validated' | 'profile_rejected'
  | 'test_sent' | 'test_completed' | 'awaiting_second_review' | 'interview_eligible' | 'interview_ineligible' | 'interview_scheduled'
  | 'interviewed' | 'group_eligible' | 'group_scheduled' | 'group_completed' | 'selected' | 'conditional_selected'
  | 'waitlisted' | 'not_selected' | 'onboarding_sent' | 'buddy_assigned' | 'integrated' | 'discarded' | 'withdrawn';
export const allowedApplicationTransitions: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  draft: ['withdrawn'], incomplete: ['withdrawn'], expired: [],
  // Two stages or direct decision: profile advances or direct join/rejection. Older statuses only close.
  submitted: ['profile_validated', 'profile_rejected', 'selected', 'not_selected', 'withdrawn'],
  profile_validated: ['selected', 'not_selected', 'withdrawn'], profile_rejected: [],
  selected: [], not_selected: [], discarded: [], withdrawn: [],
  test_sent: ['selected', 'not_selected', 'withdrawn'], test_completed: ['selected', 'not_selected', 'withdrawn'],
  awaiting_second_review: ['selected', 'not_selected', 'withdrawn'], interview_eligible: ['selected', 'not_selected', 'withdrawn'],
  interview_scheduled: ['selected', 'not_selected', 'withdrawn'], interviewed: ['selected', 'not_selected', 'withdrawn'],
  group_eligible: ['selected', 'not_selected', 'withdrawn'], group_scheduled: ['selected', 'not_selected', 'withdrawn'],
  group_completed: ['selected', 'not_selected', 'withdrawn'], interview_ineligible: [],
  conditional_selected: [], waitlisted: ['selected', 'not_selected', 'withdrawn'],
  onboarding_sent: [], buddy_assigned: [], integrated: [],
};
export interface ApplicationVideo {
  provider: 'drive' | 'supabase'; fileId: string; uploadId: string; bytes: number; durationSeconds: number;
  contentType: string; verifiedAt: string; mode: 'recording' | 'upload';
}
export interface ApplicationEvent {
  id: string; fromStatus: ApplicationStatus | null; toStatus: ApplicationStatus; actor: string; reason: string; createdAt: string;
}
export interface RecruitmentApplication {
  id: string; data: ApplicationData; questions: RecruitmentQuestion[]; status: ApplicationStatus;
  video: ApplicationVideo | null; technicalFailureCount: number; alternateAllowed: boolean; recordingAttempts: number; isTest?: boolean; remindersOff?: boolean; lastReminderAt?: string | null;
  createdAt: string; updatedAt: string; submittedAt: string | null; history?: ApplicationEvent[];
}
export interface EmailTemplate { key: string; subject: string; body: string; enabled: boolean }
export interface RecruitmentUpload {
  id: string; provider: 'drive' | 'supabase'; fileId: string | null; mode: 'recording' | 'upload';
  contentType: string; expectedBytes: number; maxBytes: number; maxSeconds: number; status: string;
  authorization?: { provider: 'drive' | 'supabase'; fileId: string; uploadUrl: string; method: 'PUT'; headers?: Record<string, string>; expiresAt?: string; resumable?: boolean; chunkBytes?: number } | null;
}
export interface EmailQueueItem {
  id: string; applicationId: string; templateKey: string; to: string; subject: string; body: string;
  payload: Record<string, string>; attempts: number; leaseToken: string;
}
export interface RpcResponse<T> { data: T | null; error: { message: string; code?: string } | null }
