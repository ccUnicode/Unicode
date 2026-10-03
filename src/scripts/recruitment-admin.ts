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
  submitted: "Postulación enviada",
  profile_validated: "Perfil validado",
  profile_rejected: "Perfil no admitido",
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
  selected: "Seleccionado",
  conditional_selected: "Seleccionado con condición",
  waitlisted: "Lista de espera",
  not_selected: "No seleccionado",
  onboarding_sent: "Inducción enviada",
  buddy_assigned: "Buddy asignado",
  integrated: "Integrado",
  discarded: "Descartado",
  withdrawn: "Retirado",
  expired: "Plazo vencido",
  incomplete: "Incompleto",
};
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

let token = sessionStorage.getItem("admin_token") || "";
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
  if (response.status === 401) {
    clearSession();
    loginMessage("La sesión venció. Ingresa nuevamente.");
  }
  if (response.status === 403) {
    // A director outside GTH: their session stays valid for /admin.
    element("recruitment-dashboard").hidden = true;
    element("recruitment-login").hidden = false;
    loginMessage("Este panel es solo para GTH. Puedes ver todas las postulaciones en /admin.");
  }
  if (!response.ok) throw new Error(result.error || `No se pudo completar la solicitud (${response.status}).`);
  return result as T;
}

function clearSession(): void {
  token = "";
  sessionStorage.removeItem("admin_token");
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
  element<HTMLInputElement>("recruitment-password").value = "";
}

function loginMessage(message: string): void {
  const box = element("recruitment-login-message");
  box.textContent = message;
  box.hidden = false;
  box.classList.add("error");
}

element<HTMLFormElement>("recruitment-login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  const password = element<HTMLInputElement>("recruitment-password").value;
  if (!password) return;
  lockForm(form, true);
  element("recruitment-login-message").hidden = true;
  try {
    const response = await fetch("/api/admin-login", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }),
    });
    const result = await response.json() as { error?: string; token?: string };
    if (!response.ok || !result.token) throw new Error(result.error || "No se pudo iniciar sesión.");
    token = result.token;
    sessionStorage.setItem("admin_token", token);
    element<HTMLInputElement>("recruitment-password").value = "";
    await initialize();
  } catch (error) {
    loginMessage(messageOf(error));
  } finally {
    lockForm(form, false);
  }
});

element("recruitment-logout").addEventListener("click", async () => {
  const currentToken = token;
  clearSession();
  element<HTMLInputElement>("recruitment-password").focus();
  await fetch("/api/admin-logout", { method: "POST", headers: { Authorization: `Bearer ${currentToken}` } }).catch(() => undefined);
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

function directorRow(director: Director = { email: "", area: "", name: "" }): HTMLElement {
  const row = node("div", undefined, "director-row");
  const email = node("label", "Correo"); const emailInput = node("input"); emailInput.type = "email"; emailInput.required = true; emailInput.name = "email"; emailInput.placeholder = "nombre.apellido@uni.pe"; emailInput.value = director.email; email.append(emailInput);
  const name = node("label", "Nombre"); const nameInput = node("input"); nameInput.name = "name"; nameInput.maxLength = 150; nameInput.placeholder = "Opcional"; nameInput.value = director.name; name.append(nameInput);
  const area = node("label", "Área"); const select = node("select"); select.name = "area"; select.required = true;
  select.append(new Option("Elige un área", ""), ...directorAreas.map(([id, label]) => new Option(label, id, false, id === director.area))); area.append(select);
  const remove = node("button", "Quitar", "secondary remove"); remove.type = "button"; remove.addEventListener("click", () => row.remove());
  row.append(email, name, area, remove);
  return row;
}

async function loadDirectors(): Promise<void> {
  const list = element("directors-list");
  element("directors-status").textContent = "Cargando…";
  try {
    const { directors } = await request<{ directors: Director[] }>("/directors");
    list.replaceChildren(...(directors.length ? directors.map((director) => directorRow(director)) : [directorRow()]));
    element("directors-status").textContent = `${directors.length} director(es) con acceso.`;
  } catch (error) { element("directors-status").textContent = messageOf(error); }
}

element("add-director").addEventListener("click", () => {
  const row = directorRow(); element("directors-list").append(row); row.querySelector("input")?.focus();
});

element<HTMLFormElement>("directors-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget as HTMLFormElement;
  if (!form.reportValidity()) return;
  const directors = [...element("directors-list").querySelectorAll(".director-row")].map((row) => ({
    email: (row.querySelector("[name=email]") as HTMLInputElement).value.trim(),
    name: (row.querySelector("[name=name]") as HTMLInputElement).value.trim(),
    area: (row.querySelector("[name=area]") as HTMLSelectElement).value,
  })).filter((director) => director.email);
  lockForm(form, true);
  try {
    const result = await request<{ directors: Director[] }>("/directors", { method: "PUT", body: JSON.stringify({ directors }) });
    element("directors-status").textContent = `Accesos guardados: ${result.directors.length} director(es).`;
  } catch (error) { element("directors-status").textContent = messageOf(error); }
  finally { lockForm(form, false); }
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

function renderConfig(value: RecruitmentConfig): void {
  field("title").value = value.title;
  for (const dateName of ["opensAt", "closesAt", "extensionAt"] as const) field(dateName).value = limaDateInput(value[dateName]);
  field("maxApplicants").value = String(value.maxApplicants);
  field("inactivityHours").value = String(value.inactivityHours);
  field("shortCasePrompt").value = value.shortCasePrompt;
  field("preparationSeconds").value = String(value.preparationSeconds);
  field("maxVideoMB").value = String(value.maxVideoBytes / 1024 / 1024);
  field("storageProvider").value = value.storageProvider;
  (field("enabled") as HTMLInputElement).checked = value.enabled;
  field("thresholdAffinity").value = value.thresholds.affinity === null ? "" : String(value.thresholds.affinity);
  field("thresholdWritten").value = value.thresholds.written === null ? "" : String(value.thresholds.written);
  field("thresholdVideo").value = value.thresholds.video === null ? "" : String(value.thresholds.video);
  element("config-state").textContent = value.enabled ? "Habilitada según plazo" : "Cerrada";
  element("config-save-info").textContent = `Configuración guardada · versión ${value.revision}`;

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
    checkboxLabel.append(enabled, node("span", `${area.name} (${area.id})`));
    const quotaLabel = node("label", "Cupo del área");
    const quota = node("input");
    quota.type = "number";
    quota.name = `area-quota-${area.id}`;
    quota.min = "0";
    quota.max = "150";
    quota.step = "1";
    quota.placeholder = "Pendiente";
    quota.value = area.quota === null ? "" : String(area.quota);
    const percentage = node("small", "Porcentaje: pendiente");
    percentage.id = `area-percentage-${area.id}`;
    percentage.setAttribute("aria-live", "polite");
    quotaLabel.append(quota, percentage);
    quota.addEventListener("input", updateAreaPercentages);
    enabled.addEventListener("change", updateAreaPercentages);
    card.append(checkboxLabel, quotaLabel);
    areas.append(card);
  });
  updateAreaPercentages();

  const bank = element("question-config");
  bank.replaceChildren();
  for (const category of ["motivation", "collaboration"] as const) {
    const group = node("div", undefined, "question-group");
    group.append(node("h3", categoryNames[category]));
    value.questions.filter((question) => question.category === category).forEach((question, index) => {
      const item = node("div", undefined, "question-item");
      item.dataset.questionId = question.id;
      const label = node("label", `Pregunta ${index + 1}`);
      const text = node("textarea");
      text.rows = 3;
      text.maxLength = 2000;
      text.required = true;
      text.name = `question-text-${question.id}`;
      text.value = question.text;
      label.append(text);
      const enabledLabel = node("label", undefined, "check-line");
      const enabled = node("input");
      enabled.type = "checkbox";
      enabled.name = `question-enabled-${question.id}`;
      enabled.checked = question.enabled !== false;
      enabledLabel.append(enabled, node("span", "Disponible para asignación"));
      item.append(label, enabledLabel);
      group.append(item);
    });
    bank.append(group);
  }
  const rubric = element("video-rubric-config");
  rubric.replaceChildren();
  value.videoRubric.forEach((criterion) => {
    const card = node("div", undefined, "stack compact");
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
  const labels = [
    readiness.localDevelopment ? "Base local de desarrollo" : "Base de datos disponible",
    readiness.video ? "Video: credenciales configuradas" : "Video: conexión pendiente",
    readiness.email ? "Correo: credenciales configuradas" : "Correo: conexión pendiente",
    readiness.resumeEncryption ? "Enlaces personales protegidos" : "Protección de enlaces pendiente",
  ];
  labels.forEach((label) => list.append(node("span", label, "badge")));
}

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
    maxApplicants: Number(field("maxApplicants").value),
    minAvailabilityHours: 0,
    inactivityHours: Number(field("inactivityHours").value),
    shortCasePrompt: field("shortCasePrompt").value.trim(),
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
    questions: config.questions.map((question) => ({
      ...question,
      text: field(`question-text-${question.id}`).value.trim(),
      enabled: (field(`question-enabled-${question.id}`) as HTMLInputElement).checked,
    })),
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

const statusFilter = element<HTMLSelectElement>("filter-status");
(Object.keys(statusNames) as ApplicationStatus[]).forEach((status) => statusFilter.add(new Option(statusNames[status], status)));
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
    const info = node("div");
    info.append(node("h3", `${application.data.firstName} ${application.data.lastName}`.trim() || "Borrador sin nombre"));
    info.append(node("p", application.data.email || "Sin correo", "muted"));
    const meta = node("div", undefined, "app-meta");
    if (application.isTest) meta.append(node("span", "Prueba", "badge test"));
    meta.append(node("span", statusNames[application.status] || application.status, "badge"));
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
    ["Estado", statusNames[application.status] || application.status], ["Correo", data.email || "Pendiente"],
    ["Teléfono", data.phone || "Pendiente"], ["Universidad", data.university || "Pendiente"],
    ["Facultad", data.faculty || "Pendiente"], ["Ingreso", data.admissionTerm || "Pendiente"],
    ["Carrera", data.career || "Pendiente"], ["Ciclo", data.semester === "0" ? "Egresado" : data.semester || "Pendiente"],
    ["Primera opción", areaName(data.firstChoiceArea)], ["Segunda opción", data.secondChoiceArea ? areaName(data.secondChoiceArea) : "Sin segunda opción"],
    ["Disponibilidad semanal", data.availabilityHours === null ? "Pendiente" : `${data.availabilityHours} horas`],
    ["Consentimiento", data.consent ? "Aceptado" : "Pendiente"],
    ["Registro", formattedDate(application.createdAt)], ["Envío completo", formattedDate(application.submittedAt)],
  ];
  entries.forEach(([label, text]) => {
    const pair = node("div");
    const definition = node("dl");
    definition.append(node("dt", label), node("dd", text));
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
    const group = node("div");
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
  const next = element<HTMLSelectElement>("next-status");
  next.replaceChildren();
  // The same transition map is used by the server; prerequisites are checked there.
  allowedApplicationTransitions[application.status].forEach((following) => next.add(new Option(statusNames[following], following)));
  if (!next.options.length) next.add(new Option("Sin transición administrativa disponible", ""));
  const terminal = !next.value;
  next.disabled = terminal;
  element<HTMLButtonElement>("save-transition").disabled = terminal;
  element<HTMLTextAreaElement>("transition-reason").disabled = terminal;
  element<HTMLTextAreaElement>("transition-reason").value = "";
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

element<HTMLFormElement>("transition-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedApplication) return;
  const id = selectedApplication.id;
  const status = element<HTMLSelectElement>("next-status").value;
  const reason = element<HTMLTextAreaElement>("transition-reason").value.trim();
  if (!status || !reason) return;
  const button = element<HTMLButtonElement>("save-transition");
  button.disabled = true;
  try {
    await request(`/applications/${encodeURIComponent(id)}/transition`, { method: "POST", body: JSON.stringify({ status, reason }) });
    showMessage("Estado actualizado y cambio registrado en el historial.");
    await loadApplications();
    await loadDetail(id);
  } catch (error) {
    showMessage(messageOf(error), true);
  } finally {
    if (selectedApplication?.id === id) button.disabled = !element<HTMLSelectElement>("next-status").value;
  }
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

function templateName(key: string): string {
  return key === "resume" ? "Enlace para continuar y recordatorio" : statusNames[key as ApplicationStatus] || key;
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

function renderTemplates(): void {
  element("template-variables").textContent = `${allowedTemplateVariables.map((variable) => `{{${variable}}}`).join(", ")}. {{resumeUrl}} se usa en el enlace para continuar y el recordatorio de postulación incompleta.`;
  const list = element("template-list");
  list.replaceChildren();
  templates.forEach((template) => {
    const card = node("fieldset", undefined, "panel template-card");
    card.dataset.templateKey = template.key;
    card.append(node("legend", templateName(template.key)));
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
    body.rows = 5;
    body.maxLength = 5000;
    body.required = true;
    body.value = template.body;
    bodyLabel.append(body);
    const enabledLabel = node("label", undefined, "check-line");
    const enabled = node("input");
    enabled.name = `enabled-${template.key}`;
    enabled.type = "checkbox";
    enabled.checked = template.enabled;
    enabledLabel.append(enabled, node("span", "Enviar al llegar a esta etapa"));
    card.append(subjectLabel, bodyLabel, enabledLabel);
    list.append(card);
  });
}

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
  result.queue.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 30).forEach((item) => {
    const row = node("div", undefined, "email-row");
    const info = node("div");
    const application = applications.find((candidate) => candidate.id === item.applicationId);
    const applicant = application ? `${application.data.firstName} ${application.data.lastName}`.trim() : `Postulación ${item.applicationId.slice(0, 8)}`;
    info.append(node("p", `${templateName(item.templateKey)} · ${applicant}`));
    info.append(node("p", `${formattedDate(item.sentAt || item.createdAt)} · ${item.attempts} intento(s)`, "muted"));
    if (item.lastError) info.append(node("p", item.lastError, "muted"));
    if (item.nextAttemptAt && !["sent", "delivered", "failed", "cancelled"].includes(item.status)) info.append(node("p", `Próximo intento: ${formattedDate(item.nextAttemptAt)}`, "muted"));
    row.append(info, node("span", queueLabel(item.status), "badge"));
    list.append(row);
  });
  if (result.queue.length > 30) list.append(node("p", "Se muestran los últimos 30 registros de la cola.", "muted"));
}

element("refresh-emails").addEventListener("click", async () => {
  const button = element<HTMLButtonElement>("refresh-emails");
  button.disabled = true;
  try { await loadQueue(); } catch (error) { showMessage(messageOf(error), true); } finally { button.disabled = false; }
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

if (token) void initialize();

export {};
