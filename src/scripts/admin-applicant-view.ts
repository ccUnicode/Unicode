/** Read-only presentation of director applications. Escape every applicant-supplied value. */
export interface Applicant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  university: string;
  faculty: string;
  career: string;
  admission_term: string;
  university_semester: number | string;
  availability_hours: number | null;
  first_choice_area: string;
  second_choice_area?: string | null;
  application_reason: string;
  short_case?: string;
  showcase?: string;
  organizations?: string;
  referral_source?: string;
  questions?: string[];
  video_url?: string | null;
  has_video: boolean;
  created_at: string;
}

const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

export const applicantName = (applicant: Applicant) => `${applicant.first_name || ""} ${applicant.last_name || ""}`.trim() || "Sin nombre";
const semester = (applicant: Applicant) => applicant.university_semester === 0 || applicant.university_semester === "0" ? "Egresado" : applicant.university_semester ? `${applicant.university_semester}° ciclo` : "Ciclo no indicado";
export function applicantDate(value: string, full = false): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no registrada";
  return date.toLocaleString("es-PE", { day: "2-digit", month: "short", ...(full ? { year: "numeric", hour: "2-digit", minute: "2-digit" } : {}), timeZone: "America/Lima" });
}

const optionBadge = (isFirst: boolean) => `<span class="inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium whitespace-nowrap ${isFirst ? "bg-unicode/10 text-unicode-light" : "bg-zinc-800 text-zinc-300"}">${isFirst ? "1ra opción" : "2da opción"}</span>`;

const applicantInitials = (applicant: Applicant) => [applicant.first_name, applicant.last_name].map((part) => [...String(part ?? "").trim()][0] || "").join("").toLocaleUpperCase("es") || "—";

export function applicantListMarkup(applicants: Applicant[], area: string): string {
  if (!applicants.length) return "";
  const rows = applicants.map((applicant, index) => {
    const isFirst = applicant.first_choice_area === area;
    const otherArea = isFirst ? applicant.second_choice_area : applicant.first_choice_area;
    return `<li role="listitem" class="applicant-card grid grid-cols-2 lg:grid-cols-[minmax(0,1fr)_120px_140px_120px_120px] lg:items-center gap-x-4 gap-y-4 border-b border-zinc-800/70 last:border-b-0 px-4 sm:px-5 py-5 hover:bg-zinc-900/60 focus-within:bg-zinc-900/60">
      <div class="col-span-2 lg:col-span-1 flex items-start lg:items-center gap-3.5 min-w-0">
        <span class="flex shrink-0 w-10 h-10 items-center justify-center rounded-full border border-zinc-700/50 bg-zinc-800/60 text-zinc-300 text-[14px] font-medium" aria-hidden="true">${escape(applicantInitials(applicant))}</span>
        <div class="min-w-0">
          <h3 class="font-semibold text-base leading-6 text-white [overflow-wrap:anywhere]">${escape(applicantName(applicant))}</h3>
          <p class="text-zinc-400 text-[14px] leading-5 mt-1 [overflow-wrap:anywhere]">${escape(applicant.career) || "Carrera no indicada"}</p>
          <p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-zinc-500 text-[12px] mt-1.5"><span class="text-zinc-400">${escape(semester(applicant))}</span><span class="text-zinc-700" aria-hidden="true">·</span><span><span class="sr-only">Registrado el </span>${escape(applicantDate(applicant.created_at))}</span></p>
        </div>
      </div>
      <div class="min-w-0">
        <p class="lg:sr-only text-zinc-500 text-[12px] mb-2">Disponibilidad</p>
        <p class="text-zinc-200 text-[15px] font-medium">${applicant.availability_hours == null ? "No indicada" : `${escape(applicant.availability_hours)} <span class="text-zinc-500 text-[12px] font-normal lg:block lg:mt-1">horas/semana</span>`}</p>
      </div>
      <div class="min-w-0">
        <p class="lg:sr-only text-zinc-500 text-[12px] mb-2">Preferencia</p>
        ${optionBadge(isFirst)}
        ${otherArea ? `<p class="text-zinc-500 text-[12px] mt-1.5 [overflow-wrap:anywhere]">${isFirst ? "2da" : "1ra"}: <span class="text-zinc-400">${escape(otherArea)}</span></p>` : ""}
      </div>
      <div class="col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/70 pt-3 lg:contents">
        <span class="inline-flex items-center gap-2 text-[14px] ${applicant.has_video ? "text-zinc-300" : "text-zinc-500"}">
          ${applicant.has_video ? `<svg class="w-3.5 h-3.5 shrink-0 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"></rect><path stroke-linejoin="round" d="m10 9 5 3-5 3Z"></path></svg><span><span class="lg:hidden">Video disponible</span><span class="hidden lg:inline"><span class="sr-only">Video </span>Disponible</span></span>` : `<span class="w-3.5 text-center text-zinc-600" aria-hidden="true">—</span><span>Sin video</span>`}
        </span>
        <button type="button" class="detail-button min-h-11 shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full border border-zinc-700 py-2 px-3 text-[14px] font-medium text-zinc-200 whitespace-nowrap hover:bg-zinc-800 hover:text-white hover:border-zinc-500 cursor-pointer focus-visible:outline-2 focus-visible:outline-unicode focus-visible:outline-offset-4" data-index="${index}" aria-label="Ver ficha de ${escape(applicantName(applicant))}">
          Ver ficha <svg class="w-3.5 h-3.5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m9 5 7 7-7 7"></path></svg>
        </button>
      </div>
    </li>`;
  }).join("");
  return `<div class="rounded-2xl border border-zinc-800/80 bg-zinc-900/25">
    <div class="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_120px_140px_120px_120px] gap-x-4 items-center border-b border-zinc-800/80 px-5 py-3.5 text-[12px] text-zinc-500" aria-hidden="true"><span class="pl-[54px]">Postulante</span><span>Disponibilidad</span><span>Preferencia</span><span>Video</span><span></span></div>
    <ol role="list" class="list-none" aria-label="Postulantes">${rows}</ol>
  </div>`;
}

function information(label: string, value: unknown, wide = false): string {
  return `<div class="min-w-0 ${wide ? "sm:col-span-2" : ""}"><dt class="text-zinc-500 text-[12px] mb-1.5">${label}</dt><dd class="text-zinc-300 text-[14px] leading-relaxed [overflow-wrap:anywhere]">${escape(value) || "No indicado"}</dd></div>`;
}

function answer(label: string, value: unknown): string {
  return `<div><h4 class="text-zinc-400 text-[14px] font-medium mb-2">${label}</h4><p class="text-zinc-200 text-[15px] leading-7 whitespace-pre-wrap [overflow-wrap:anywhere]">${escape(value) || "Sin respuesta registrada."}</p></div>`;
}

export function applicantDetailMarkup(applicant: Applicant): string {
  return `<section aria-label="Preferencias y video" class="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <dl class="flex flex-wrap gap-6">${information("Primera opción", applicant.first_choice_area)}${information("Segunda opción", applicant.second_choice_area || "No seleccionada")}</dl>
        ${applicant.has_video ? `<button type="button" class="video-button min-h-11 inline-flex items-center gap-2 rounded-full bg-unicode px-4 py-2.5 text-[14px] font-semibold text-black hover:bg-unicode-light cursor-pointer disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-unicode focus-visible:outline-offset-4" data-id="${escape(applicant.id)}"><svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m8 4 12 8-12 8V4Z"></path></svg>Ver video</button>` : `<span class="text-zinc-500 text-[14px]">Sin video registrado</span>`}
      </div>
      ${applicant.questions?.length ? `<details class="group mt-4 border-t border-zinc-800 pt-4"><summary class="min-h-11 flex items-center justify-between cursor-pointer list-none text-zinc-400 text-[14px] hover:text-white focus-visible:outline-2 focus-visible:outline-unicode rounded"><span>Preguntas asignadas al video <span class="text-zinc-600 ml-1">(${applicant.questions.length})</span></span><svg class="w-3.5 h-3.5 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"></path></svg></summary><ol class="list-decimal pl-4 mt-4 space-y-3 text-zinc-300 text-[14px] leading-6 [overflow-wrap:anywhere]">${applicant.questions.map((question) => `<li>${escape(question)}</li>`).join("")}</ol></details>` : ""}
    </section>
    <section aria-labelledby="applicant-contact-heading"><h3 id="applicant-contact-heading" class="text-[15px] font-semibold mb-4">Contacto</h3><dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">${information("Correo", applicant.email)}${information("Teléfono", applicant.phone)}</dl></section>
    <section aria-labelledby="applicant-study-heading" class="border-t border-zinc-800 pt-6"><h3 id="applicant-study-heading" class="text-[15px] font-semibold mb-4">Formación y disponibilidad</h3><dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">${information("Universidad", applicant.university, true)}${information("Facultad", applicant.faculty, true)}${information("Carrera", applicant.career, true)}${information("Ciclo", semester(applicant))}${information("Ingreso", applicant.admission_term)}${information("Disponibilidad", applicant.availability_hours == null ? "No indicada" : `${applicant.availability_hours} horas por semana`)}</dl></section>
    <section aria-labelledby="applicant-answers-heading" class="border-t border-zinc-800 pt-6"><h3 id="applicant-answers-heading" class="text-[15px] font-semibold mb-5">Respuestas</h3><div class="space-y-6">${answer("Motivación", applicant.application_reason)}${applicant.short_case ? answer("Caso breve", applicant.short_case) : ""}${applicant.showcase ? answer("Algo que hizo", applicant.showcase) : ""}${applicant.organizations ? answer("Otras organizaciones", applicant.organizations) : ""}</div></section>
    ${applicant.referral_source ? `<dl class="border-t border-zinc-800 pt-6">${information("Cómo conoció UNICODE", applicant.referral_source)}</dl>` : ""}`;
}
