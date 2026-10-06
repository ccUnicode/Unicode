import type {
  ApplicationStatus,
  EmailTemplate,
  QuestionCategory,
  RecruitmentApplication,
  RecruitmentConfig,
} from "../lib/recruitment/types";
import { allowedApplicationTransitions } from "../lib/recruitment/types";

const apiRoot = "/api/recruitment/admin";
const statusNames: Record<ApplicationStatus, string> = {
  draft: "Borrador",
  submitted: "Inscripción completa",
  profile_validated: "Avanza a la 2.ª etapa",
  profile_rejected: "No avanza",
  test_sent: "Prueba enviada",
  test_completed: "Prueba completada",
  awaiting_second_review: "Pendiente de segunda revisión",
  interview_eligible: "Habilitado para entrevista",
  interview_ineligible: "No habilitado para entrevista",
  interview_scheduled: "Entrevista programada",
  interviewed: "Entrevista realizada",
  group_eligible: "Habilitado para dinámica grupal",
  group_scheduled: "Dinámica grupal programada",
  group_completed: "Dinámica grupal completada",
  selected: "Ingresa a UNICODE",
  conditional_selected: "Seleccionado con condición",
  waitlisted: "Lista de espera",
  not_selected: "No ingresa",
  onboarding_sent: "Inducción enviada",
  buddy_assigned: "Buddy asignado",
  integrated: "Integrado",
  discarded: "Descartado",
  withdrawn: "Retirado",
  expired: "Plazo vencido",
  incomplete: "Incompleto",
};
/** One color per moment of the process, so the list can be read at a glance. */
type StatusTone = "progress" | "complete" | "advanced" | "joined" | "negative" | "inactive";
function statusTone(status: ApplicationStatus): StatusTone {
  if (status === "draft" || status === "incomplete") return "progress";
  if (status === "submitted") return "complete";
  if (status === "selected" || status === "conditional_selected" || status === "onboarding_sent" || status === "buddy_assigned" || status === "integrated") return "joined";
  if (status === "profile_rejected" || status === "not_selected" || status === "interview_ineligible" || status === "discarded") return "negative";
  if (status === "expired" || status === "withdrawn") return "inactive";
  return "advanced";
}
function statusBadge(status: ApplicationStatus): HTMLElement {
  return node("span", statusNames[status] || status, `badge status status-${statusTone(status)}`);
}

interface StatusMeta {
  key: ApplicationStatus;
  shortLabel: string;
  filterLabel: string;
  category: "evaluation" | "draft";
  description: string;
}

const activeStatuses: StatusMeta[] = [
  // 1.ª Etapa de evaluación
  {
    key: "submitted",
    shortLabel: "Inscripción completa",
    filterLabel: "Inscripción completa · Pendiente de 1.ª etapa",
    category: "evaluation",
    description: "Postulación y video recibidos. Pendiente de revisión de perfil en la primera etapa.",
  },
  {
    key: "profile_validated",
    shortLabel: "Avanza a la 2.ª etapa",
    filterLabel: "Avanza a la 2.ª etapa · Perfil aprobado",
    category: "evaluation",
    description: "Perfil aprobado en la 1.ª etapa. Avanza a la evaluación final.",
  },
  {
    key: "profile_rejected",
    shortLabel: "No avanza",
    filterLabel: "No avanza · Descartado en 1.ª etapa",
    category: "evaluation",
    description: "No superó la revisión de perfil en la primera etapa.",
  },
  // 2.ª Etapa de evaluación
  {
    key: "selected",
    shortLabel: "Ingresa a UNICODE",
    filterLabel: "Ingresa a UNICODE · Seleccionado final",
    category: "evaluation",
    description: "Postulante seleccionado/a definitivamente, por decisión directa o tras la 2.ª etapa.",
  },
  {
    key: "not_selected",
    shortLabel: "No ingresa",
    filterLabel: "No ingresa · No seleccionado en 2.ª etapa",
    category: "evaluation",
    description: "No fue seleccionado/a, por decisión directa o tras la 2.ª etapa.",
  },
  // Borradores y gestión
  {
    key: "draft",
    shortLabel: "Borrador",
    filterLabel: "Borrador · En edición",
    category: "draft",
    description: "Postulación iniciada aún en edición por el postulante.",
  },
  {
    key: "incomplete",
    shortLabel: "Incompleto",
    filterLabel: "Incompleto · Con recordatorios automáticos",
    category: "draft",
    description: "Borrador sin actividad que recibe recordatorios periódicos por correo.",
  },
  {
    key: "expired",
    shortLabel: "Plazo vencido",
    filterLabel: "Plazo vencido · No enviado a tiempo",
    category: "draft",
    description: "Borrador que no se completó antes del cierre de la convocatoria.",
  },
  {
    key: "withdrawn",
    shortLabel: "Retirado",
    filterLabel: "Retirado · Cancelado",
    category: "draft",
    description: "Postulación cancelada o retirada.",
  },
];

function statusLabelWithDesc(status: ApplicationStatus): string {
  const meta = activeStatuses.find((s) => s.key === status);
  const name = statusNames[status] || status;
  return meta ? `${name} (${meta.description})` : name;
}

const categoryNames: Record<QuestionCategory, string> = {
  motivation: "Motivación y calce cultural",
  collaboration: "Colaboración y resolución de problemas",
};

interface QueueItem {
  id: string;
  applicationId: string;
  templateKey: string;
  status: string;
  attempts: number;
  nextAttemptAt: string | null;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
}
interface Readiness {
  database: boolean;
  localDevelopment: boolean;
  video: boolean;
  email: boolean;
  resumeEncryption: boolean;
  individualStaffIdentity: boolean;
}

function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Falta un elemento de la página: ${id}`);
  return found as T;
}

function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, className?: string): HTMLElementTagNameMap[K] {
  const value = document.createElement(tag);
  if (text !== undefined) value.textContent = text;
  if (className) value.className = className;
  return value;
}

function showMessage(message: string, error = false): void {
  const box = element("admin-message");
  box.textContent = message;
  box.classList.toggle("error", error);
  box.hidden = false;
  box.setAttribute("role", error ? "alert" : "status");
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "No se pudo completar la solicitud.";
}

// Same session as /admin: kept for two days, also after closing the browser.
const readToken = () => { try { return localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token") || ""; } catch { return ""; } };
let token = readToken();
let config: RecruitmentConfig | null = null;
let applications: RecruitmentApplication[] = [];
let templates: EmailTemplate[] = [];
let selectedApplication: RecruitmentApplication | null = null;
let allowedTemplateVariables = ["firstName", "lastName", "title", "status", "resumeUrl"];
let loadingApplications = false;
let detailRequest = 0;
let lastDetailButton: HTMLButtonElement | null = null;

const configForm = element<HTMLFormElement>("recruitment-config-form");

function lockForm(form: HTMLFormElement, locked: boolean): void {
  form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>("input, select, textarea, button").forEach((input) => {
    // The fixed video constraints are informational and remain disabled.
    if (input instanceof HTMLInputElement && input.type === "text" && !input.name) return;
    input.disabled = locked;
  });
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (options.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${apiRoot}${path}`, { ...options, headers, cache: "no-store" });
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (response.status === 401) { clearSession(); toLogin("expirada"); }
  // A director outside GTH keeps their session for /admin.
  if (response.status === 403) location.replace("/admin?sin_gth=1");
  if (!response.ok) throw new Error(result.error || `No se pudo completar la solicitud (${response.status}).`);
  return result as T;
}

function clearSession(): void {
  token = "";
  try { localStorage.removeItem("admin_token"); sessionStorage.removeItem("admin_token"); } catch { /* Storage blocked. */ }
  config = null;
  applications = [];
  templates = [];
  selectedApplication = null;
  detailRequest++;
  element("recruitment-dashboard").hidden = true;
  element("recruitment-login").hidden = false;
  // Remove protected data from the DOM after expiration or logout.
  ["applications-list", "detail-title", "detail-personal", "detail-answers", "detail-questions", "detail-history", "detail-video-info", "video-access-message", "template-list", "email-list", "email-summary"].forEach((id) => element(id).replaceChildren());
  const detail = element<HTMLDialogElement>("application-detail");
  if (detail.open) detail.close();
}

/** There is a single sign-in, in /admin; it brings GTH back here afterwards. */
function toLogin(reason?: "expirada"): void {
  location.replace(`/admin?volver=gth${reason ? `&${reason}=1` : ""}`);
}

element("recruitment-logout").addEventListener("click", async () => {
  const currentToken = token;
  const page = document.querySelector<HTMLElement>(".recruitment-admin")!;
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) { page.classList.add("is-leaving"); await new Promise((resolve) => setTimeout(resolve, 180)); }
  clearSession();
  await fetch("/api/admin-logout", { method: "POST", headers: { Authorization: `Bearer ${currentToken}` } }).catch(() => undefined);
  location.replace("/admin");
});

function switchPanel(panel: string): void {
  for (const name of ["configuration", "applications", "communications", "access"]) {
    element(`panel-${name}`).hidden = name !== panel;
  }
  document.querySelectorAll<HTMLButtonElement>("[data-panel]").forEach((button) => {
    if (button.dataset.panel === panel) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (panel === "applications") void loadApplications();
  if (panel === "communications") void loadCommunications();
  if (panel === "access") void loadDirectors();
}

type Director = { email: string; area: string; name: string };
const directorAreas: [string, string][] = [["GTH", "Gestión del Talento Humano"], ["ID", "Investigación y Desarrollo"], ["RRPP", "Relaciones Públicas"], ["ACD", "Académica"], ["DCC", "Comunicación y Contenido"], ["LGE", "Logística y Gestión de Eventos"], ["FIN", "Finanzas"]];

const areaLabel = (id: string) => directorAreas.find(([key]) => key === id)?.[1] ?? id;
const initials = (text: string) => text.split(/[\s.@]+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join("") || "?";

function directorItem(director: Director): HTMLElement {
  const item = node("li", undefined, "director-item");
  const avatar = node("span", initials(director.name || director.email), "director-avatar");
  avatar.setAttribute("aria-hidden", "true");
  const who = node("div", undefined, "director-who");
  who.append(node("strong", director.name || director.email), node("span", director.name ? director.email : "Sin nombre registrado"));
  const area = node("select");
  area.setAttribute("aria-label", `Área de ${director.name || director.email}`);
  area.append(...directorAreas.map(([id, label]) => new Option(label, id, false, id === director.area)));
  area.addEventListener("change", async () => {
    area.disabled = true;
    try {
      const { directors } = await request<{ directors: Director[] }>("/directors", { method: "POST", body: JSON.stringify({ ...director, area: area.value }) });
      renderDirectors(directors, `Listo: ${director.name || director.email} ahora está en ${areaLabel(area.value)}.`);
    } catch (error) { area.value = director.area; element("directors-status").textContent = messageOf(error); area.disabled = false; }
  });
  const remove = node("button", "Quitar", "secondary");
  remove.type = "button";
  remove.addEventListener("click", async () => {
    if (!confirm(`${director.name || director.email} dejará de poder entrar al panel. ¿Quitar su acceso?`)) return;
    remove.disabled = true;
    try {
      const { directors } = await request<{ directors: Director[] }>("/directors/remove", { method: "POST", body: JSON.stringify({ email: director.email }) });
      renderDirectors(directors, `Se quitó el acceso de ${director.name || director.email}.`);
    } catch (error) { element("directors-status").textContent = messageOf(error); remove.disabled = false; }
  });
  item.append(avatar, who, area, remove);
  return item;
}

function renderDirectors(directors: Director[], status = ""): void {
  const sorted = [...directors].sort((a, b) => directorAreas.findIndex(([id]) => id === a.area) - directorAreas.findIndex(([id]) => id === b.area) || (a.name || a.email).localeCompare(b.name || b.email, "es"));
  const list = element("directors-list");
  list.replaceChildren(...(sorted.length ? sorted.map(directorItem) : [node("li", "Todavía no hay directores. Agrega el primero arriba.", "muted director-item")]));
  element("directors-count").textContent = `Directores con acceso (${directors.length})`;
  element("directors-status").textContent = status;
}

async function loadDirectors(): Promise<void> {
  element("directors-status").textContent = "Cargando…";
  try { renderDirectors((await request<{ directors: Director[] }>("/directors")).directors); }
  catch (error) { element("directors-status").textContent = messageOf(error); }
}

const addForm = element<HTMLFormElement>("director-add");
(addForm.elements.namedItem("area") as HTMLSelectElement).append(new Option("Elige un área", ""), ...directorAreas.map(([id, label]) => new Option(label, id)));
addForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!addForm.reportValidity()) return;
  const value = (name: string) => (addForm.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement).value.trim();
  lockForm(addForm, true);
  try {
    const { directors } = await request<{ directors: Director[] }>("/directors", { method: "POST", body: JSON.stringify({ email: value("email"), name: value("name"), area: value("area") }) });
    renderDirectors(directors, `Listo: ${value("name") || value("email")} ya puede entrar con su correo.`);
    addForm.reset();
  } catch (error) { element("directors-status").textContent = messageOf(error); }
  finally { lockForm(addForm, false); }
});

document.querySelectorAll<HTMLButtonElement>("[data-panel]").forEach((button) => {
  button.addEventListener("click", () => switchPanel(button.dataset.panel || "configuration"));
});

function field(name: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  const found = configForm.elements.namedItem(name);
  if (!(found instanceof HTMLInputElement || found instanceof HTMLTextAreaElement || found instanceof HTMLSelectElement)) {
    throw new Error(`Falta el campo ${name}.`);
  }
  return found;
}

function limaDateInput(value: string | null): string {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function fromLimaInput(value: string): string | null {
  return value ? new Date(`${value}:00-05:00`).toISOString() : null;
}

function formattedDate(value: string | null | undefined): string {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleString("es-PE", { timeZone: "America/Lima", dateStyle: "medium", timeStyle: "short" });
}

function optionalNumber(name: string): number | null {
  const value = field(name).value.trim();
  return value === "" ? null : Number(value);
}

function areaName(id: string): string {
  return config?.areas.find((area) => area.id === id)?.name || id || "Sin área";
}

let recruitmentCountdownInterval: number | undefined;
function renderRecruitmentCountdown(targetIso: string | null): void {
  if (recruitmentCountdownInterval) clearInterval(recruitmentCountdownInterval);
  const el = document.getElementById("recruitment-countdown");
  if (!el) return;
  if (!targetIso) { el.hidden = true; return; }
  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) { el.hidden = true; return; }
  el.hidden = true;

  const update = () => {
    const diff = target - Date.now();
    el.hidden = diff <= 0 || diff > 86_400_000;
    if (diff > 86_400_000) return;
    if (diff <= 0) {
      el.innerHTML = `<span class="countdown-badge is-closed">Convocatoria cerrada</span>`;
      if (recruitmentCountdownInterval) clearInterval(recruitmentCountdownInterval);
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    const pad = (n: number) => String(n).padStart(2, "0");
    el.innerHTML = `<span class="countdown-badge" title="Tiempo restante para el cierre de convocatoria"><svg class="countdown-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Cierre en: <strong>${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s</strong></span>`;
  };
  update();
  recruitmentCountdownInterval = window.setInterval(update, 1000);
}

function renderConfig(value: RecruitmentConfig): void {
  field("title").value = value.title;
  for (const dateName of ["opensAt", "closesAt", "extensionAt"] as const) field(dateName).value = limaDateInput(value[dateName]);
  field("inactivityHours").value = String(value.inactivityHours);
  field("preparationSeconds").value = String(value.preparationSeconds);
  field("maxVideoMB").value = String(value.maxVideoBytes / 1024 / 1024);
  field("storageProvider").value = value.storageProvider;
  (field("enabled") as HTMLInputElement).checked = value.enabled;
  field("thresholdAffinity").value = value.thresholds.affinity === null ? "" : String(value.thresholds.affinity);
  field("thresholdWritten").value = value.thresholds.written === null ? "" : String(value.thresholds.written);
  field("thresholdVideo").value = value.thresholds.video === null ? "" : String(value.thresholds.video);
  element("config-state").textContent = value.enabled ? "Habilitada según plazo" : "Cerrada";
  element("config-save-info").textContent = `Configuración guardada · versión ${value.revision}`;
  renderRecruitmentCountdown(value.extensionAt || value.closesAt);

  const areas = element("area-config");
  areas.replaceChildren();
  value.areas.forEach((area) => {
    const card = node("div", undefined, "area-card");
    card.dataset.areaId = area.id;
    const checkboxLabel = node("label", undefined, "check-line");
    const enabled = node("input");
    enabled.type = "checkbox";
    enabled.name = `area-enabled-${area.id}`;
    enabled.checked = area.enabled;
    checkboxLabel.append(enabled, node("span", area.name, "area-name"));
    const header = node("div", undefined, "area-card-header");
    header.append(checkboxLabel, node("span", area.id, "area-code"));
    const quotaLabel = node("label", "Cupo del área");
    const quota = node("input");
    quota.type = "number";
    quota.name = `area-quota-${area.id}`;
    quota.min = "0";
    quota.max = "10000";
    quota.step = "1";
    quota.placeholder = "Pendiente";
    quota.value = area.quota === null ? "" : String(area.quota);
    const percentage = node("small", "Porcentaje: pendiente");
    percentage.id = `area-percentage-${area.id}`;
    percentage.setAttribute("aria-live", "polite");
    quotaLabel.append(quota, percentage);
    quota.addEventListener("input", updateAreaPercentages);
    enabled.addEventListener("change", updateAreaPercentages);
    card.append(header, quotaLabel);
    areas.append(card);
  });
  updateAreaPercentages();

  bankQuestions = value.questions.map((question) => ({ ...question }));
  renderBank();
  const rubric = element("video-rubric-config");
  rubric.replaceChildren();
  value.videoRubric.forEach((criterion) => {
    const card = node("div", undefined, "stack compact rubric-card");
    const label = node("label", "Criterio (máximo 5 puntos)");
    const title = node("input");
    title.name = `rubric-label-${criterion.id}`;
    title.value = criterion.label;
    title.maxLength = 150;
    title.required = true;
    label.append(title);
    card.append(label);
    const descriptors = node("div", undefined, "field-grid three");
    for (const [key, name] of [["low", "Nivel bajo"], ["medium", "Nivel medio"], ["high", "Nivel alto"]] as const) {
      const descriptorLabel = node("label", name);
      const text = node("textarea");
      text.name = `rubric-${key}-${criterion.id}`;
      text.value = criterion[key];
      text.rows = 3;
      text.maxLength = 2000;
      text.required = true;
      descriptorLabel.append(text);
      descriptors.append(descriptorLabel);
    }
    card.append(descriptors);
    rubric.append(card);
  });
  updateAreaFilter();
}

/** The question bank is edited in place: add, change, switch off or delete each question. */
let bankQuestions: RecruitmentConfig["questions"] = [];
function syncBank(): void {
  for (const question of bankQuestions) {
    const text = configForm.elements.namedItem(`question-text-${question.id}`) as HTMLTextAreaElement | null;
    const enabled = configForm.elements.namedItem(`question-enabled-${question.id}`) as HTMLInputElement | null;
    if (text) question.text = text.value;
    if (enabled) question.enabled = enabled.checked;
  }
}
function renderBank(focusId?: string): void {
  const bank = element("question-config");
  bank.replaceChildren();
  for (const category of ["motivation", "collaboration"] as const) {
    const group = node("div", undefined, "question-group");
    const inCategory = bankQuestions.filter((question) => question.category === category);
    const active = inCategory.filter((question) => question.enabled !== false).length;
    const title = node("div", undefined, "question-group-title");
    title.append(node("h3", categoryNames[category]), node("span", `${inCategory.length} preguntas · ${active} activas`, "muted"));
    group.append(title);
    inCategory.forEach((question, index) => {
      const item = node("div", undefined, `question-item${question.enabled === false ? " is-off" : ""}`);
      item.dataset.questionId = question.id;
      const head = node("div", undefined, "question-item-head");
      head.append(node("span", `Pregunta ${index + 1}`, "question-number"));
      const remove = node("button", "Eliminar", "question-remove");
      remove.type = "button";
      remove.setAttribute("aria-label", `Eliminar la pregunta ${index + 1} de ${categoryNames[category]}`);
      remove.addEventListener("click", () => {
        syncBank();
        if (question.text.trim() && !confirm("¿Eliminar esta pregunta del banco? Quienes ya la recibieron la conservan en su postulación.")) return;
        bankQuestions = bankQuestions.filter((candidate) => candidate.id !== question.id);
        renderBank();
        setDirty("config-save-bar", "config-save-info", true);
      });
      head.append(remove);
      const text = node("textarea");
      text.rows = 3;
      text.maxLength = 2000;
      text.required = true;
      text.name = `question-text-${question.id}`;
      text.placeholder = "Escribe la pregunta";
      text.setAttribute("aria-label", `Pregunta ${index + 1} de ${categoryNames[category]}`);
      text.value = question.text;
      const enabledLabel = node("label", undefined, "check-line");
      const enabled = node("input");
      enabled.type = "checkbox";
      enabled.name = `question-enabled-${question.id}`;
      enabled.checked = question.enabled !== false;
      enabled.addEventListener("change", () => { syncBank(); renderBank(); });
      enabledLabel.append(enabled, node("span", "Disponible para asignación"));
      item.append(head, text, enabledLabel);
      group.append(item);
    });
    const add = node("button", "Agregar pregunta", "secondary question-add");
    add.type = "button";
    add.addEventListener("click", () => {
      syncBank();
      const id = `${category}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      bankQuestions.push({ id, category, text: "", enabled: true });
      renderBank(id);
      setDirty("config-save-bar", "config-save-info", true);
    });
    group.append(add);
    bank.append(group);
  }
  if (focusId) (configForm.elements.namedItem(`question-text-${focusId}`) as HTMLTextAreaElement | null)?.focus();
}

function updateAreaPercentages(): void {
  if (!config) return;
  const quotas = config.areas.map((area) => ({
    id: area.id,
    enabled: (field(`area-enabled-${area.id}`) as HTMLInputElement).checked,
    quota: optionalNumber(`area-quota-${area.id}`),
  }));
  const total = quotas.reduce((sum, area) => sum + (area.enabled && area.quota !== null && area.quota >= 0 ? area.quota : 0), 0);
  quotas.forEach((area) => {
    const percentage = element(`area-percentage-${area.id}`);
    percentage.textContent = area.enabled && area.quota !== null && area.quota >= 0 && total > 0
      ? `${new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 }).format(area.quota / total * 100)}% de los cupos habilitados`
      : "Porcentaje: pendiente";
  });
}

async function loadConfig(): Promise<void> {
  lockForm(configForm, true);
  const response = await request<{ config: RecruitmentConfig; readiness?: Readiness; previewEnabled?: boolean }>("/config");
  config = response.config;
  renderConfig(config);
  renderReadiness(response.readiness);
  renderPreview(response.previewEnabled === true);
  lockForm(configForm, false);
}

function renderReadiness(readiness?: Readiness): void {
  const list = element("connection-status");
  list.replaceChildren();
  if (!readiness) return;
  const items: [string, boolean, string, string][] = [
    ["Base de datos", readiness.database, readiness.localDevelopment ? "Local (desarrollo)" : "Conectada", "Pendiente"],
    ["Videos", readiness.video, "Google Drive conectado", "Pendiente"],
    ["Correos", readiness.email, "Envío configurado", "Pendiente"],
    ["Enlaces personales", readiness.resumeEncryption, "Protegidos", "Pendiente"],
  ];
  for (const [label, ready, okText, pendingText] of items) {
    const item = node("li", undefined, ready ? "" : "is-pending");
    item.append(node("span", label, "status-label"), node("span", ready ? okText : pendingText, "status-value"));
    list.append(item);
  }
}

function setDirty(bar: string, info: string, dirty: boolean, idle = "Los cambios se aplican al guardar."): void {
  element(bar).classList.toggle("is-dirty", dirty);
  element(info).textContent = dirty ? "Tienes cambios sin guardar." : idle;
}
for (const type of ["input", "change"]) configForm.addEventListener(type, () => setDirty("config-save-bar", "config-save-info", true));
window.addEventListener("beforeunload", (event) => { if (document.querySelector(".save-bar.is-dirty")) event.preventDefault(); });

configForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!config || !configForm.reportValidity()) return;
  const updated: RecruitmentConfig = {
    ...config,
    title: field("title").value.trim(),
    enabled: (field("enabled") as HTMLInputElement).checked,
    opensAt: fromLimaInput(field("opensAt").value),
    closesAt: fromLimaInput(field("closesAt").value),
    extensionAt: fromLimaInput(field("extensionAt").value),
    maxApplicants: config.maxApplicants,
    minAvailabilityHours: 0,
    inactivityHours: Number(field("inactivityHours").value),
    shortCasePrompt: config.shortCasePrompt,
    preparationSeconds: Number(field("preparationSeconds").value),
    maxVideoBytes: Math.round(Number(field("maxVideoMB").value) * 1024 * 1024),
    storageProvider: field("storageProvider").value as RecruitmentConfig["storageProvider"],
    maxVideoSeconds: 210,
    questionsPerCategory: 2,
    thresholds: { affinity: optionalNumber("thresholdAffinity"), written: optionalNumber("thresholdWritten"), video: optionalNumber("thresholdVideo") },
    areas: config.areas.map((area) => ({
      ...area,
      enabled: (field(`area-enabled-${area.id}`) as HTMLInputElement).checked,
      quota: optionalNumber(`area-quota-${area.id}`),
    })),
    questions: (syncBank(), bankQuestions.map((question) => ({ ...question, text: question.text.trim() }))),
    videoRubric: config.videoRubric.map((criterion) => ({
      ...criterion,
      label: field(`rubric-label-${criterion.id}`).value.trim(),
      low: field(`rubric-low-${criterion.id}`).value.trim(),
      medium: field(`rubric-medium-${criterion.id}`).value.trim(),
      high: field(`rubric-high-${criterion.id}`).value.trim(),
      maxScore: 5,
    })),
  };
  if (updated.enabled && (!updated.opensAt || !updated.closesAt)) {
    showMessage("Define apertura y cierre antes de habilitar la convocatoria.", true);
    return;
  }
  if (updated.enabled && !updated.areas.some((area) => area.enabled)) {
    showMessage("Habilita al menos un área de postulación.", true);
    return;
  }
  for (const category of ["motivation", "collaboration"] as const) {
    if (updated.questions.filter((question) => question.category === category && question.enabled).length < 2) {
      showMessage(`Mantén al menos dos preguntas activas en ${categoryNames[category]}.`, true);
      return;
    }
  }
  lockForm(configForm, true);
  try {
    const result = await request<{ config: RecruitmentConfig }>("/config", { method: "PUT", body: JSON.stringify(updated) });
    config = result.config;
    renderConfig(config);
    // Refresh readiness for the chosen provider after changing storage settings.
    const readiness = await request<{ config: RecruitmentConfig; readiness?: Readiness }>("/config").catch(() => null);
    renderReadiness(readiness?.readiness);
    setDirty("config-save-bar", "config-save-info", false, `Configuración guardada · versión ${config.revision}`);
    showMessage("Configuración guardada. Las preguntas ya asignadas conservan su texto original.");
  } catch (error) {
    showMessage(messageOf(error), true);
  } finally {
    lockForm(configForm, false);
  }
});

function updateAreaFilter(): void {
  const select = element<HTMLSelectElement>("filter-area");
  const selected = select.value;
  select.replaceChildren(new Option("Todas las áreas", ""));
  config?.areas.forEach((area) => select.add(new Option(`${area.name} (${area.id})`, area.id)));
  select.value = selected;
}

function updateStatusFilter(apps: RecruitmentApplication[] = []): void {
  const currentVal = statusFilter.value;
  statusFilter.replaceChildren(new Option("Todos los estados", ""));

  const evalGroup = document.createElement("optgroup");
  evalGroup.label = "Etapas de selección";
  const draftGroup = document.createElement("optgroup");
  draftGroup.label = "Borradores y gestión";

  for (const item of activeStatuses) {
    const opt = new Option(item.filterLabel, item.key);
    if (item.category === "evaluation") {
      evalGroup.appendChild(opt);
    } else {
      draftGroup.appendChild(opt);
    }
  }

  statusFilter.appendChild(evalGroup);
  statusFilter.appendChild(draftGroup);

  const activeKeys = new Set(activeStatuses.map((s) => s.key));
  const legacyStatuses = new Set<string>();
  for (const app of apps) {
    if (app.status && !activeKeys.has(app.status)) {
      legacyStatuses.add(app.status);
    }
  }
  if (legacyStatuses.size > 0) {
    const legacyGroup = document.createElement("optgroup");
    legacyGroup.label = "Estados históricos";
    for (const legacyKey of legacyStatuses) {
      const name = statusNames[legacyKey as ApplicationStatus] || legacyKey;
      legacyGroup.appendChild(new Option(`${name} (Histórico)`, legacyKey));
    }
    statusFilter.appendChild(legacyGroup);
  }

  statusFilter.value = currentVal;
}

const statusFilter = element<HTMLSelectElement>("filter-status");
updateStatusFilter();
for (const id of ["filter-status", "filter-area"]) element(id).addEventListener("change", renderApplications);
element("filter-search").addEventListener("input", renderApplications);
element("refresh-applications").addEventListener("click", () => void loadApplications());

async function loadApplications(): Promise<void> {
  if (loadingApplications) return;
  loadingApplications = true;
  element<HTMLButtonElement>("refresh-applications").disabled = true;
  element("applications-info").textContent = "Cargando postulaciones…";
  try {
    const result = await request<{ applications: RecruitmentApplication[] }>("/applications");
    applications = result.applications;
    updateStatusFilter(applications);
    renderPreview();
    element("application-count").textContent = String(applications.length);
    renderApplications();
  } catch (error) {
    element("applications-info").textContent = "No se pudieron cargar las postulaciones. Usa Actualizar para reintentar.";
    showMessage(messageOf(error), true);
  } finally {
    loadingApplications = false;
    element<HTMLButtonElement>("refresh-applications").disabled = false;
  }
}

function renderApplications(): void {
  const status = statusFilter.value;
  const area = element<HTMLSelectElement>("filter-area").value;
  const search = element<HTMLInputElement>("filter-search").value.trim().toLocaleLowerCase("es");
  const matches = applications.filter((application) => {
    const data = application.data;
    return (!status || application.status === status)
      && (!area || data.firstChoiceArea === area || data.secondChoiceArea === area)
      && (!search || `${data.firstName} ${data.lastName} ${data.email}`.toLocaleLowerCase("es").includes(search));
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  element("applications-info").textContent = `${matches.length} de ${applications.length} postulaciones · Horario de Lima`;
  const list = element("applications-list");
  list.replaceChildren();
  if (!matches.length) {
    list.append(node("p", "No hay postulaciones con estos filtros.", "muted"));
    return;
  }
  matches.forEach((application) => {
    const card = node("article", undefined, "app-card");
    const info = node("div", undefined, "app-card-info");
    info.append(node("h3", `${application.data.firstName} ${application.data.lastName}`.trim() || "Borrador sin nombre"));
    info.append(node("p", application.data.email || "Sin correo", "muted"));
    const meta = node("div", undefined, "app-meta");
    if (application.isTest) meta.append(node("span", "Prueba", "badge test"));
    meta.append(statusBadge(application.status));
    card.classList.add(`tone-${statusTone(application.status)}`);
    const statusMeta = activeStatuses.find((s) => s.key === application.status);
    if (statusMeta) meta.lastElementChild?.setAttribute("title", statusMeta.description);
    if (application.data.firstChoiceArea) meta.append(node("span", `1. ${areaName(application.data.firstChoiceArea)}`, "muted"));
    if (application.data.secondChoiceArea) meta.append(node("span", `2. ${areaName(application.data.secondChoiceArea)}`, "muted"));
    info.append(meta, node("p", formattedDate(application.createdAt), "muted"));
    const button = node("button", "Ver detalle", "secondary");
    button.type = "button";
    button.addEventListener("click", () => {
      lastDetailButton = button;
      void loadDetail(application.id);
    });
    card.append(info, button);
    list.append(card);
  });
}

async function loadDetail(id: string): Promise<void> {
  const currentRequest = ++detailRequest;
  try {
    const result = await request<{ application: RecruitmentApplication }>(`/applications/${encodeURIComponent(id)}`);
    if (currentRequest !== detailRequest || !token) return;
    selectedApplication = result.application;
    renderDetail(result.application);
    // A side panel over the list: the list keeps its scroll position.
    const detail = element<HTMLDialogElement>("application-detail");
    if (!detail.open) { detail.showModal(); document.documentElement.style.overflow = "hidden"; }
    detail.scrollTop = 0;
    element("close-detail").focus({ preventScroll: true });
  } catch (error) {
    showMessage(messageOf(error), true);
  }
}

element("close-detail").addEventListener("click", () => element<HTMLDialogElement>("application-detail").close());
// Esc, the close button and a click outside the panel all end here.
element("application-detail").addEventListener("close", () => {
  detailRequest++;
  selectedApplication = null;
  document.documentElement.style.overflow = "";
  lastDetailButton?.focus({ preventScroll: true });
});
element("application-detail").addEventListener("click", (event) => {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
  if (event.target === event.currentTarget && event.clientX < box.left) element<HTMLDialogElement>("application-detail").close();
});

function renderDetail(application: RecruitmentApplication): void {
  const data = application.data;
  element("detail-title").textContent = `${data.firstName} ${data.lastName}`.trim() || "Borrador sin nombre";
  const personal = element("detail-personal");
  personal.replaceChildren();
  const entries: [string, string][] = [
    ["Estado", statusLabelWithDesc(application.status)], ["Correo", data.email || "Pendiente"],
    ["Teléfono", data.phone || "Pendiente"], ["Universidad", data.university || "Pendiente"],
    ["Facultad", data.faculty || "Pendiente"], ["Ingreso", data.admissionTerm || "Pendiente"],
    ["Carrera", data.career || "Pendiente"], ["Ciclo", data.semester === "0" ? "Egresado" : data.semester || "Pendiente"],
    ["Primera opción", areaName(data.firstChoiceArea)], ["Segunda opción", data.secondChoiceArea ? areaName(data.secondChoiceArea) : "Sin segunda opción"],
    ["Disponibilidad semanal", data.availabilityHours === null ? "Pendiente" : `${data.availabilityHours} horas`],
    ["Consentimiento", data.consent ? "Aceptado" : "Pendiente"],
    ["Recordatorios", application.remindersOff ? "Los desactivó el postulante" : application.lastReminderAt ? `Activos · último: ${formattedDate(application.lastReminderAt)}` : "Activos"],
    ["Registro", formattedDate(application.createdAt)], ["Envío completo", formattedDate(application.submittedAt)],
  ];
  entries.forEach(([label, text]) => {
    const pair = node("div");
    const definition = node("dl");
    const dd = node("dd");
    if (label === "Teléfono" && data.phone) {
      const digits = data.phone.replace(/\D/g, "");
      const waNumber = digits.length === 9 ? `51${digits}` : digits;
      const link = document.createElement("a");
      link.href = `https://wa.me/${waNumber}`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "inline-link";
      link.title = "Abrir chat de WhatsApp";
      link.textContent = `${data.phone} (WhatsApp ↗)`;
      dd.append(link);
    } else if (label === "Estado") {
      const badge = node("span", statusNames[application.status] || application.status, `badge status status-${statusTone(application.status)}`);
      const desc = activeStatuses.find((s) => s.key === application.status)?.description;
      dd.append(badge);
      if (desc) dd.append(node("small", ` · ${desc}`, "muted"));
    } else {
      dd.textContent = text;
    }
    definition.append(node("dt", label), dd);
    pair.append(definition);
    personal.append(pair);
  });
  const answers = element("detail-answers");
  answers.replaceChildren();
  // The short case question was removed; only applications that answered it still show it.
  const answered = (label: string, value: string | undefined) => (value ? [[label, value]] : []);
  for (const [label, answer] of [["Motivación", data.motivation], ...answered("Algo que hizo", data.showcase), ...answered("Otras organizaciones", data.organizations), ...answered("Cómo se enteró", data.referralSource), ...answered("Caso corto", data.shortCase)]) {
    const box = node("div");
    box.append(node("h3", label), node("p", answer || "Pendiente de respuesta", "answer-text"));
    answers.append(box);
  }
  const questions = element("detail-questions");
  questions.replaceChildren();
  for (const category of ["motivation", "collaboration"] as const) {
    const group = node("div", undefined, "assigned-question-group");
    group.append(node("h3", categoryNames[category]));
    const list = node("ol", undefined, "assigned-questions");
    const assigned = application.questions.filter((question) => question.category === category);
    assigned.forEach((question) => list.append(node("li", question.text)));
    if (!assigned.length) group.append(node("p", "Aún no se han asignado preguntas.", "muted"));
    else group.append(list);
    questions.append(group);
  }
  const video = application.video;
  element("detail-video-info").textContent = video
    ? `${video.mode === "recording" ? "Grabado en la web" : "Carga alternativa"} · ${video.durationSeconds.toFixed(1)} segundos · ${(video.bytes / 1024 / 1024).toFixed(1)} MB · ${video.provider === "drive" ? "Google Drive" : "Supabase"}`
    : "Aún no hay un video verificado.";
  element("open-video").hidden = !video;
  element("video-access-message").hidden = true;
  renderStageButtons(application);
  const history = element("detail-history");
  history.replaceChildren();
  if (!application.history?.length) history.append(node("li", "No hay cambios registrados.", "muted"));
  application.history?.forEach((event) => {
    const entry = node("li");
    const change = event.fromStatus ? `${statusNames[event.fromStatus]} → ${statusNames[event.toStatus]}` : statusNames[event.toStatus];
    entry.append(node("p", change), node("p", `${formattedDate(event.createdAt)} · ${event.actor}`, "muted"));
    if (event.reason) entry.append(node("p", event.reason, "answer-text"));
    history.append(entry);
  });
}

/** Each result is one button: it changes the status and sends that email to the applicant. Direct decisions (skipping 2nd stage) are allowed. */
const stageActions: Partial<Record<ApplicationStatus, { title: string; buttons: [ApplicationStatus, string, string][] }>> = {
  submitted: {
    title: "Evaluación y decisión (1.ª etapa o directa)",
    buttons: [
      ["profile_validated", "Avanza a la 2.ª etapa", "primary"],
      ["selected", "Ingresa directo a UNICODE", "primary"],
      ["profile_rejected", "No avanza (1.ª etapa)", "secondary"],
      ["not_selected", "No ingresa", "secondary"],
    ],
  },
  profile_validated: {
    title: "Segunda etapa: resultado final",
    buttons: [
      ["selected", "Ingresa a UNICODE", "primary"],
      ["not_selected", "No ingresa", "secondary"],
    ],
  },
};

function renderStageButtons(application: RecruitmentApplication): void {
  const box = element("stage-buttons");
  box.replaceChildren();
  const stage = stageActions[application.status] ?? (allowedApplicationTransitions[application.status].includes("selected") ? stageActions.profile_validated : undefined);
  element("stage-title").textContent = stage?.title ?? "Resultado";
  element("stage-hint").textContent = stage
    ? "Cada botón cambia el estado y le envía al postulante el correo de ese resultado. No se puede deshacer."
    : ["draft", "incomplete"].includes(application.status)
      ? "Aún no completa su inscripción. Le recordaremos terminarla si deja pasar el tiempo configurado sin avanzar."
      : `Estado actual: ${statusNames[application.status] || application.status}. Ya no quedan resultados por enviar.`;
  for (const [status, label, kind] of stage?.buttons ?? []) {
    const button = node("button", label, kind);
    button.type = "button";
    button.addEventListener("click", () => void sendResult(application, status, label));
    box.append(button);
  }
}

async function sendResult(application: RecruitmentApplication, status: ApplicationStatus, label: string): Promise<void> {
  const name = `${application.data.firstName} ${application.data.lastName}`.trim();
  if (!confirm(`«${label}» para ${name}. Se le enviará el correo de este resultado a ${application.data.email}. ¿Continuar?`)) return;
  const buttons = [...element("stage-buttons").querySelectorAll("button")];
  buttons.forEach((button) => { button.disabled = true; });
  try {
    await request(`/applications/${encodeURIComponent(application.id)}/transition`, { method: "POST", body: JSON.stringify({ status, reason: `Resultado enviado: ${label}.` }) });
    showMessage(`Listo: ${label}. El correo quedó en camino a ${application.data.email}.`);
    await loadApplications();
    await loadDetail(application.id);
  } catch (error) {
    showMessage(messageOf(error), true);
    buttons.forEach((button) => { button.disabled = false; });
  }
}

element("delete-application").addEventListener("click", async () => {
  const application = selectedApplication;
  if (!application) return;
  const name = `${application.data.firstName} ${application.data.lastName}`.trim() || application.data.email || "esta postulación";
  const typed = prompt(`Se eliminará la postulación de ${name}, con su historial y su video. No se puede deshacer.\n\nEscribe ELIMINAR para confirmar.`);
  if (typed?.trim().toUpperCase() !== "ELIMINAR") return;
  const button = element<HTMLButtonElement>("delete-application");
  button.disabled = true;
  try {
    const result = await request<{ videosDeleted: number; videosPending: number }>(`/applications/${encodeURIComponent(application.id)}/delete`, { method: "POST", body: "{}" });
    element<HTMLDialogElement>("application-detail").close();
    showMessage(`Se eliminó la postulación de ${name}.${result.videosPending ? " El video no se pudo borrar: revisa la carpeta de Drive." : ""}`);
    await loadApplications();
  } catch (error) { showMessage(messageOf(error), true); }
  finally { button.disabled = false; }
});

element("open-video").addEventListener("click", async () => {
  if (!selectedApplication?.video) return;
  const id = selectedApplication.id;
  const button = element<HTMLButtonElement>("open-video");
  const message = element("video-access-message");
  // Opening during the click avoids popup blocking after the asynchronous request.
  const viewer = window.open("about:blank", "_blank");
  if (viewer) viewer.opener = null;
  button.disabled = true;
  try {
    const result = await request<{ url: string }>(`/applications/${encodeURIComponent(id)}/video`);
    const url = new URL(result.url, window.location.origin);
    if (url.protocol !== "https:" && url.origin !== window.location.origin) throw new Error("El servidor no devolvió un enlace seguro para el video.");
    if (viewer) {
      viewer.location.replace(url.href);
      message.textContent = "Video abierto en una nueva pestaña.";
    } else {
      const link = node("a", "Abrir video en una nueva pestaña", "back-link");
      link.href = url.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      message.replaceChildren(link);
    }
    message.hidden = false;
  } catch (error) {
    viewer?.close();
    showMessage(messageOf(error), true);
  } finally {
    button.disabled = false;
  }
});

const templateInfo: Record<string, [string, string]> = {
  resume: ["Enlace personal", "Al guardar el borrador por primera vez. Trae el botón para continuar."],
  incomplete: ["Recordatorio: falta completar", "Si el borrador pasa las horas de inactividad configuradas sin avanzar."],
  submitted: ["Inscripción completa", "Automático, al confirmar el envío de la postulación."],
  profile_validated: ["Avanza a la 2.ª etapa", "Botón «Avanza a la 2.ª etapa» en el detalle del postulante."],
  profile_rejected: ["No avanza", "Botón «No avanza» en el detalle del postulante."],
  selected: ["Ingresa a UNICODE", "Botón «Ingresa a UNICODE» en el detalle del postulante."],
  not_selected: ["No ingresa", "Botón «No ingresa» en el detalle del postulante."],
};
const templateOrder = Object.keys(templateInfo);
function templateName(key: string): string {
  return templateInfo[key]?.[0] ?? (statusNames[key as ApplicationStatus] || key);
}

async function loadCommunications(): Promise<void> {
  const results = await Promise.allSettled([loadTemplates(), loadQueue()]);
  const failed = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  if (failed.length) showMessage(failed.map((result) => messageOf(result.reason)).join(" "), true);
}

async function loadTemplates(): Promise<void> {
  const result = await request<{ templates: EmailTemplate[]; allowedTemplateVariables?: string[] }>("/templates");
  templates = result.templates;
  if (result.allowedTemplateVariables) allowedTemplateVariables = result.allowedTemplateVariables;
  renderTemplates();
}

function templateCard(template: EmailTemplate): HTMLElement {
  const card = node("section", undefined, `template-card${template.enabled ? "" : " is-off"}`);
  card.dataset.templateKey = template.key;
  const head = node("div", undefined, "template-head");
  const title = node("div");
  title.append(node("h4", templateName(template.key)), node("p", templateInfo[template.key]?.[1] ?? "Etapa del proceso anterior; ya no se usa.", "muted"));
  const toggle = node("label", undefined, "template-toggle");
  const enabled = node("input");
  enabled.name = `enabled-${template.key}`;
  enabled.type = "checkbox";
  enabled.checked = template.enabled;
  enabled.addEventListener("change", () => card.classList.toggle("is-off", !enabled.checked));
  toggle.append(enabled, node("span", "Activo"));
  head.append(title, toggle);
  const subjectLabel = node("label", "Asunto");
  const subject = node("input");
  subject.name = `subject-${template.key}`;
  subject.maxLength = 200;
  subject.required = true;
  subject.value = template.subject;
  subjectLabel.append(subject);
  const bodyLabel = node("label", "Mensaje");
  const body = node("textarea");
  body.name = `body-${template.key}`;
  body.rows = 4;
  body.maxLength = 5000;
  body.required = true;
  body.value = template.body;
  bodyLabel.append(body);
  card.append(head, subjectLabel, bodyLabel);
  return card;
}

function renderTemplates(): void {
  element("template-variables").textContent = `${allowedTemplateVariables.map((variable) => `{{${variable}}}`).join(", ")}. {{resumeUrl}} solo en el enlace personal y el recordatorio.`;
  const rank = (key: string) => (templateOrder.includes(key) ? templateOrder.indexOf(key) : templateOrder.length);
  const sorted = [...templates].sort((a, b) => rank(a.key) - rank(b.key));
  const active = sorted.filter((template) => template.enabled || templateOrder.includes(template.key));
  const old = sorted.filter((template) => !active.includes(template));
  element("template-list").replaceChildren(...active.map(templateCard));
  element("disabled-template-list").replaceChildren(...old.map(templateCard));
  const folded = element<HTMLDetailsElement>("disabled-templates");
  folded.hidden = !old.length;
  folded.querySelector("summary")!.textContent = `Plantillas del proceso anterior, desactivadas (${old.length})`;
  setDirty("templates-save-bar", "templates-save-info", false);
}
for (const type of ["input", "change"]) element("templates-form").addEventListener(type, () => setDirty("templates-save-bar", "templates-save-info", true));

element<HTMLFormElement>("templates-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  if (!templates.length || !form.reportValidity()) return;
  const edited = templates.map((template) => ({
    ...template,
    subject: (form.elements.namedItem(`subject-${template.key}`) as HTMLInputElement).value.trim(),
    body: (form.elements.namedItem(`body-${template.key}`) as HTMLTextAreaElement).value.trim(),
    enabled: (form.elements.namedItem(`enabled-${template.key}`) as HTMLInputElement).checked,
  }));
  for (const template of edited) {
    const placeholders = [...`${template.subject}\n${template.body}`.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map((match) => match[1]);
    const invalid = placeholders.find((variable) => !allowedTemplateVariables.includes(variable) || (variable === "resumeUrl" && !["resume", "incomplete"].includes(template.key)));
    if (invalid) {
      showMessage(`La plantilla ${templateName(template.key)} contiene una variable no permitida: ${invalid}.`, true);
      return;
    }
  }
  lockForm(form, true);
  try {
    const result = await request<{ templates: EmailTemplate[] }>("/templates", { method: "PUT", body: JSON.stringify({ templates: edited }) });
    templates = result.templates;
    renderTemplates();
    showMessage("Plantillas guardadas.");
  } catch (error) {
    showMessage(messageOf(error), true);
  } finally {
    lockForm(form, false);
  }
});

function queueLabel(status: string): string {
  const names: Record<string, string> = { pending: "Pendiente", leased: "En proceso", processing: "En proceso", sent: "Enviado", delivered: "Enviado", failed: "Fallido", retry: "Pendiente de reintento", cancelled: "Cancelado" };
  return names[status] || status;
}

async function loadQueue(): Promise<void> {
  const result = await request<{ queue: QueueItem[] }>("/queue");
  const summary = element("email-summary");
  summary.replaceChildren();
  const sent = result.queue.filter((item) => item.status === "sent" || item.status === "delivered").length;
  const failed = result.queue.filter((item) => item.status === "failed").length;
  const pending = result.queue.filter((item) => !["sent", "delivered", "failed", "cancelled"].includes(item.status)).length;
  for (const [count, label] of [[pending, "Pendientes"], [sent, "Enviados"], [failed, "Fallidos"]] as const) {
    const stat = node("div", undefined, "stat");
    stat.append(node("strong", String(count)), node("span", label));
    summary.append(stat);
  }
  const list = element("email-list");
  list.replaceChildren();
  if (!result.queue.length) list.append(node("p", "Todavía no hay correos en la cola.", "muted"));
  const recent = result.queue.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 30);
  const more = element<HTMLButtonElement>("email-more");
  more.hidden = recent.length <= 6;
  more.textContent = `Ver ${recent.length - 6} más`;
  more.onclick = () => { list.querySelectorAll<HTMLElement>(".email-row[hidden]").forEach((row) => { row.hidden = false; }); more.hidden = true; };
  recent.forEach((item, index) => {
    const row = node("div", undefined, "email-row");
    const info = node("div");
    const application = applications.find((candidate) => candidate.id === item.applicationId);
    const applicant = application ? `${application.data.firstName} ${application.data.lastName}`.trim() : `Postulación ${item.applicationId.slice(0, 8)}`;
    info.append(node("p", `${templateName(item.templateKey)} · ${applicant}`));
    info.append(node("p", `${formattedDate(item.sentAt || item.createdAt)} · ${item.attempts} intento(s)`, "muted"));
    if (item.lastError) info.append(node("p", item.lastError, "muted"));
    if (item.nextAttemptAt && !["sent", "delivered", "failed", "cancelled"].includes(item.status)) info.append(node("p", `Próximo intento: ${formattedDate(item.nextAttemptAt)}`, "muted"));
    row.append(info, node("span", queueLabel(item.status), "badge"));
    row.hidden = index >= 6;
    list.append(row);
  });
  if (result.queue.length > 30) more.textContent += " (de los últimos 30)";
}

element("refresh-emails").addEventListener("click", async () => {
  const button = element<HTMLButtonElement>("refresh-emails");
  button.disabled = true;
  try { await loadQueue(); } catch (error) { showMessage(messageOf(error), true); } finally { button.disabled = false; }
});

element("remind-all").addEventListener("click", async () => {
  const pending = applications.filter((application) => ["draft", "incomplete"].includes(application.status) && !application.isTest && !application.remindersOff).length;
  if (!confirm(`Se enviará ahora el recordatorio a ${pending} postulante(s) que no terminaron (excepto quienes los desactivaron). ¿Continuar?`)) return;
  const button = element<HTMLButtonElement>("remind-all");
  button.disabled = true;
  try {
    const { queued } = await request<{ queued: number }>("/remind-all", { method: "POST", body: "{}" });
    showMessage(`Listo: ${queued} recordatorio(s) en camino. Los que no salgan en este momento se envían en los próximos minutos.`);
    await loadQueue();
  } catch (error) { showMessage(messageOf(error), true); }
  finally { button.disabled = false; }
});

element("process-emails").addEventListener("click", async () => {
  const button = element<HTMLButtonElement>("process-emails");
  button.disabled = true;
  const resultBox = element("email-process-result");
  try {
    const result = await request<{ sent: number; failed: number; remaining: number; processed: number; skipped?: boolean; reason?: string }>("/process-emails", { method: "POST", body: "{}" });
    resultBox.textContent = result.skipped
      ? (result.reason || "El envío de correos aún no está habilitado en el servidor.")
      : `Procesamiento terminado: ${result.sent} enviado(s), ${result.failed} fallido(s), ${result.remaining} pendiente(s).`;
    resultBox.hidden = false;
    await loadQueue();
  } catch (error) {
    showMessage(messageOf(error), true);
  } finally {
    button.disabled = false;
  }
});

let previewActive = false;
function renderPreview(enabled = previewActive): void {
  previewActive = enabled;
  const tests = applications.filter((application) => application.isTest).length;
  element("preview-state").textContent = `${enabled ? "Hay un enlace de prueba activo." : "No hay enlace de prueba activo."} Postulaciones de prueba: ${tests}.`;
  element<HTMLButtonElement>("preview-disable").disabled = !enabled;
}

element("preview-create").addEventListener("click", async () => {
  if (!confirm("Se generará un enlace nuevo y el anterior dejará de funcionar. ¿Continuar?")) return;
  try {
    const { url } = await request<{ url: string }>("/preview-link", { method: "POST", body: "{}" });
    element<HTMLInputElement>("preview-link").value = url;
    element("preview-link-box").hidden = false;
    element<HTMLInputElement>("preview-link").select();
    await navigator.clipboard?.writeText(url).catch(() => undefined);
    showMessage("Enlace de prueba generado y copiado. Compártelo solo con quienes van a probar.");
    renderPreview(true);
  } catch (error) { showMessage(messageOf(error), true); }
});

element("preview-disable").addEventListener("click", async () => {
  try {
    await request("/preview-link/disable", { method: "POST", body: "{}" });
    element("preview-link-box").hidden = true;
    showMessage("El enlace de prueba quedó desactivado.");
    renderPreview(false);
  } catch (error) { showMessage(messageOf(error), true); }
});

element("purge-tests").addEventListener("click", async () => {
  if (!confirm("Se borrarán todas las postulaciones marcadas como «Prueba», con su historial, correos pendientes y videos. No se puede deshacer. ¿Continuar?")) return;
  try {
    const result = await request<{ removed: number; videosDeleted: number; videosPending: number }>("/purge-tests", { method: "POST", body: "{}" });
    showMessage(`Se borraron ${result.removed} postulación(es) de prueba y ${result.videosDeleted} video(s).${result.videosPending ? ` ${result.videosPending} video(s) no se pudieron borrar: revisa la carpeta de Drive.` : ""}`);
    await loadApplications();
  } catch (error) { showMessage(messageOf(error), true); }
});

async function initialize(): Promise<void> {
  element("recruitment-login").hidden = true;
  element("recruitment-dashboard").hidden = false;
  lockForm(configForm, true);
  try {
    await loadConfig();
    void loadApplications();
  } catch (error) {
    if (!token) return;
    showMessage(`${messageOf(error)} La configuración y las postulaciones requieren la conexión del servidor.`, true);
    element("config-state").textContent = "Conexión pendiente";
    const retry = node("button", "Reintentar conexión", "secondary");
    retry.type = "button";
    retry.addEventListener("click", () => { retry.remove(); void initialize(); });
    element("admin-message").append(node("br"), retry);
  }
}

if (token) void initialize(); else toLogin();

export {};
