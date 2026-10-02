import type { ApplicationData, RecruitmentApplication, RecruitmentConfig } from "../lib/recruitment/types";
import { attachCombobox, careerSuggestions, facultySuggestions, knownPlace, matchUniversities } from "./study-combobox.ts";
import { forgetAnswer, forgetEverything, loadAnswer, loadForm, loadSession, saveAnswer, saveForm, saveSession } from "./recruitment-local.ts";

type UploadSession = {
  uploadId: string; provider: "drive" | "supabase"; fileId: string;
  uploadUrl: string; method: "PUT"; headers?: Record<string, string>;
};
type CameraState = "idle" | "ready" | "rehearsal" | "preparation" | "recording" | "answer" | "uploading" | "saved";
type DraftResponse = { application: RecruitmentApplication; resumeToken?: string };
const FORM_FIELDS = ["firstName", "lastName", "email", "phone", "university", "faculty", "career", "admissionTerm", "semester", "firstChoiceArea", "secondChoiceArea", "availabilityHours", "motivation", "consent"] as const;

/** Only storage URLs issued by our API may receive a candidate video. */
export function isAllowedUploadUrl(raw: string, provider: UploadSession["provider"]): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    if (provider === "drive") return url.hostname === "www.googleapis.com" && /^\/upload\/drive\/v3\/files(?:\/[a-zA-Z0-9_-]+)?$/.test(url.pathname) && url.searchParams.has("upload_id");
    return /^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) && url.pathname.startsWith("/storage/v1/object/upload/sign/") && url.searchParams.has("token");
  } catch { return false; }
}

export function chooseRecordingMime(recorder: typeof MediaRecorder): string | null {
  return ["video/webm;codecs=vp8,opus", "video/webm;codecs=vp9,opus", "video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4", "video/webm"].find(type => recorder.isTypeSupported(type)) ?? null;
}

const root = typeof document === "undefined" ? null : document.getElementById("recruitment");
if (root) initializeRecruitment();

function initializeRecruitment() {
  const element = <T extends HTMLElement = HTMLElement>(id: string) => {
    const item = document.getElementById(id);
    if (!item) throw new Error(`Missing recruitment element: ${id}`);
    return item as T;
  };
  const form = element<HTMLFormElement>("recruitment-data-form");
  const studyField = (id: string) => element<HTMLInputElement>(id).value;
  attachCombobox(element<HTMLInputElement>("university"), element<HTMLUListElement>("university-options"), () => matchUniversities(studyField("university"), 8));
  attachCombobox(element<HTMLInputElement>("faculty"), element<HTMLUListElement>("faculty-options"), () => facultySuggestions(studyField("university")), () => true);
  attachCombobox(element<HTMLInputElement>("career"), element<HTMLUListElement>("career-options"), () => careerSuggestions(studyField("university"), studyField("faculty")), () => knownPlace(studyField("university")));
  const camera = element<HTMLVideoElement>("camera-preview");
  const preview = element<HTMLVideoElement>("answer-preview");
  const rehearsalPreview = element<HTMLVideoElement>("rehearsal-preview");
  let config: RecruitmentConfig;
  let application: RecruitmentApplication | null = null;
  let resumeToken = "";
  const PREVIEW_KEY = "unicode-recruitment-preview";
  /** Secret test link (?prueba=…): lets the team apply on the deployed site while it is closed. */
  let previewKey = (() => {
    const fromLink = new URLSearchParams(location.search).get("prueba");
    try {
      if (fromLink) { localStorage.setItem(PREVIEW_KEY, fromLink); history.replaceState(null, "", location.pathname + location.hash); }
      return fromLink || localStorage.getItem(PREVIEW_KEY) || "";
    } catch { return fromLink || ""; }
  })();
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let cameraState: CameraState = "idle";
  let recordedBlob: Blob | null = null;
  let videoMode: "recording" | "upload" = "recording";
  let answerUrl = "";
  let rehearsalUrl = "";
  let uploadSession: UploadSession | null = null;
  let dirty = false;
  let dataVersion = 0;
  let savePromise: Promise<void> | null = null;
  let autosaveTimer: ReturnType<typeof setTimeout> | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let preparationTimer: ReturnType<typeof setInterval> | undefined;
  let recordingStartedAt = 0;
  let discardRecording = false;
  let phase: "data" | "video" | "complete" = "data";
  let pendingAction = false;
  let currentAttemptFailed = false;
  let answerPersisted = false;
  let restored = false;
  let callOpen = false;

  const show = (id: string, visible = true) => { element(id).hidden = !visible; };
  const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  const button = (id: string) => element<HTMLButtonElement>(id);
  const message = (text: string) => { element("recruitment-status").textContent = text; };
  const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Ocurrió un problema. Vuelve a intentarlo.";
  const clearError = () => { element("recruitment-error").textContent = ""; show("recruitment-error", false); };
  const showError = (error: unknown) => {
    element("recruitment-error").textContent = errorMessage(error);
    show("recruitment-error");
  };

  async function request<T>(path: string, method = "GET", body?: unknown, authenticated = true, keepalive = false): Promise<T> {
    const response = await fetch(`/api/recruitment${path}`, {
      method, cache: "no-store", credentials: "same-origin", keepalive,
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", ...(previewKey ? { "X-Recruitment-Preview": previewKey } : {}), ...(authenticated && resumeToken ? { Authorization: `Bearer ${resumeToken}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const result = await response.json().catch(() => ({ error: "No pudimos leer la respuesta. Conserva tu video e intenta nuevamente." }));
    if (!response.ok) throw new Error(result.error || "No pudimos completar la solicitud. Intenta nuevamente.");
    return result as T;
  }

  function updateControls() {
    const active = ["rehearsal", "preparation", "recording", "uploading"].includes(cameraState);
    const finished = !!application?.video;
    const attempts = application?.recordingAttempts ?? 0;
    const maxAttempts = application?.technicalFailureCount ? 2 : 1;
    const canRecord = attempts < maxAttempts && !recordedBlob && !finished;
    button("test-camera").disabled = active || finished || !!recordedBlob;
    button("rehearse").disabled = active || !stream || finished || !!recordedBlob;
    button("start-recording").disabled = active || !stream || !canRecord || pendingAction;
    button("edit-data").disabled = active;
    button("report-failure").disabled = active || finished || !!application?.technicalFailureCount || pendingAction;
    element<HTMLSelectElement>("failure-reason").disabled = button("report-failure").disabled;
    button("upload-video").disabled = !recordedBlob || active || finished || pendingAction;
    button("submit-application").disabled = !finished || active || pendingAction;
    element<HTMLInputElement>("alternate-file").disabled = active || finished || !application?.alternateAllowed || !!uploadSession || pendingAction;
    show("stop-recording", cameraState === "recording" || cameraState === "rehearsal");
    show("alternate-upload", !!application?.alternateAllowed && !finished);
    show("technical-help", !finished);
    show("video-saved", finished);
  }

  function setPhase(next: typeof phase, focus = true) {
    phase = next;
    show("data-phase", next === "data"); show("video-phase", next === "video"); show("complete-phase", next === "complete");
    for (const name of ["data", "video", "complete"] as const) {
      if (name === next) element(`step-${name}`).setAttribute("aria-current", "step");
      else element(`step-${name}`).removeAttribute("aria-current");
    }
    if (next !== "data") { clearTimeout(autosaveTimer); show("save-status", false); }
    if (next === "complete") { show("resume-panel", false); stopCamera(); }
    if (focus) element(`${next}-heading`).focus();
  }

  function populateData(data: ApplicationData) {
    for (const name of FORM_FIELDS) {
      const control = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const value = (data as unknown as Record<string, unknown>)[name];
      if (name === "consent") (control as HTMLInputElement).checked = value === true;
      else control.value = value === null || value === undefined ? "" : String(value);
    }
  }

  function collectData(): ApplicationData {
    const data = Object.fromEntries(new FormData(form).entries());
    return {
      ...data,
      availabilityHours: data.availabilityHours === "" ? null : Number(data.availabilityHours),
      consent: element<HTMLInputElement>("consent").checked,
    } as unknown as ApplicationData;
  }

  function renderQuestions() {
    const target = element("assigned-questions");
    target.replaceChildren();
    const list = document.createElement("ol");
    for (const category of ["motivation", "collaboration"]) {
      for (const question of application?.questions.filter(item => item.category === category) ?? []) {
        const item = document.createElement("li"); item.textContent = question.text; list.append(item);
      }
    }
    target.append(list);
  }

  function acceptApplication(next: RecruitmentApplication, populate = false) {
    application = next;
    element<HTMLInputElement>("email").readOnly = true;
    element<HTMLInputElement>("email").value = next.data.email;
    if (populate) populateData(next.data);
    renderQuestions();
    show("resume-panel", !!resumeToken && ["draft", "incomplete"].includes(next.status));
    if (next.video) { cameraState = "saved"; releaseAnswer(); show("video-result", false); void forgetAnswer(next.id); }
    if (next.submittedAt) {
      element("application-reference").textContent = `Referencia: ${next.id}`;
      setPhase("complete", populate);
      message("Tu postulación ya fue enviada.");
    }
    updateControls();
  }

  function rememberSession() {
    if (application && resumeToken) saveSession({ id: application.id, token: resumeToken });
  }

  /** Keeps what the applicant typed in this browser, even before the first server save. */
  function rememberForm() {
    // Before boot finishes the form is still empty; saving it would erase the cache.
    if (!restored || phase === "complete") return;
    saveForm({ id: application?.id ?? null, data: collectData(), phase: phase === "video" ? "video" : "data", pending: dirty });
  }

  type SaveState = "local" | "saving" | "saved" | "offline" | "error";
  /** Always-visible autosave indicator: the applicant never has to press a save button. */
  function saveIndicator(state: SaveState, text: string) {
    const indicator = element("save-status");
    indicator.dataset.state = state; element("save-status-text").textContent = text;
    show("save-status", phase === "data");
  }

  async function saveDraft() {
    if (savePromise) { await savePromise; if (!dirty) return; }
    const version = dataVersion;
    const data = collectData();
    savePromise = (async () => {
      saveIndicator("saving", "Guardando…");
      const result = application
        ? await request<DraftResponse>(`/drafts/${application.id}`, "PATCH", data)
        : await request<DraftResponse>("/drafts", "POST", data, false);
      if (result.resumeToken) resumeToken = result.resumeToken;
      acceptApplication(result.application);
      rememberSession();
      dirty = dataVersion !== version;
      rememberForm();
      retryDelay = 0;
      if (dirty) scheduleAutosave(); else saveIndicator("saved", "Cambios guardados");
    })();
    try { await savePromise; }
    finally { savePromise = null; }
  }

  /** The email cannot change once the draft exists, so wait until the applicant leaves that field. */
  function canCreateDraft() {
    const email = element<HTMLInputElement>("email");
    return document.activeElement !== email && email.checkValidity() && !!email.value.trim()
      && ["firstName", "lastName"].every(id => !!element<HTMLInputElement>(id).value.trim())
      && element<HTMLInputElement>("consent").checked;
  }

  let retryDelay = 0;
  function scheduleAutosave() {
    clearTimeout(autosaveTimer);
    if (phase !== "data" || !restored) return;
    if (!application && !canCreateDraft()) {
      if (dirty) saveIndicator("local", "Guardado en este dispositivo");
      return;
    }
    if (!dirty) return;
    saveIndicator("saving", "Guardando…");
    autosaveTimer = setTimeout(() => {
      void saveDraft().catch(error => {
        // fetch rejects with TypeError when there is no connection: keep retrying.
        if (error instanceof TypeError || !navigator.onLine) {
          retryDelay = Math.min(retryDelay ? retryDelay * 2 : 3000, 30000);
          saveIndicator("offline", "Sin conexión. Lo guardamos aquí y reintentamos.");
          autosaveTimer = setTimeout(scheduleAutosave, retryDelay);
        } else saveIndicator("error", `No se pudo guardar: ${errorMessage(error)}`);
      });
    }, application ? 1000 : 400);
  }

  async function runAction(action: () => Promise<void>) {
    if (pendingAction) return;
    pendingAction = true; clearError(); updateControls();
    try { await action(); } catch (error) { showError(error); }
    finally { pendingAction = false; updateControls(); }
  }

  function stopCamera() {
    if (stream) { for (const track of stream.getTracks()) { track.onended = null; track.stop(); } }
    stream = null; camera.srcObject = null; show("camera-placeholder");
  }

  async function enableCamera() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined" || !chooseRecordingMime(MediaRecorder)) {
      element<HTMLSelectElement>("failure-reason").value = "unsupported";
      throw new Error("Este navegador no permite grabar aquí. Registra la falla técnica para habilitar la carga de un video.");
    }
    stopCamera();
    element("camera-status").textContent = "Solicitando acceso a tu cámara y micrófono…";
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640, max: 1280 }, height: { ideal: 480, max: 720 }, frameRate: { ideal: 24, max: 30 }, facingMode: "user" }, audio: { echoCancellation: true, noiseSuppression: true } });
      if (!stream.getVideoTracks().length || !stream.getAudioTracks().length) throw new Error("Necesitamos cámara y micrófono para la grabación.");
      camera.srcObject = stream; await camera.play(); show("camera-placeholder", false);
      for (const track of stream.getTracks()) track.onended = () => {
        if (cameraState === "recording" || cameraState === "rehearsal") void interruptCapture("device", "La cámara o el micrófono se desconectaron.");
        else { stopCamera(); cameraState = "idle"; element("camera-status").textContent = "La cámara se desconectó. Puedes volver a activarla."; updateControls(); }
      };
      cameraState = "ready";
      element("camera-status").textContent = "Cámara y micrófono habilitados. Haz un ensayo y escucha el audio antes de continuar.";
    } catch (error) {
      stopCamera(); cameraState = "idle";
      element<HTMLSelectElement>("failure-reason").value = "permission";
      throw new Error(`No pudimos activar la cámara y el micrófono. Revisa los permisos del navegador o registra la falla técnica. ${errorMessage(error)}`);
    }
    updateControls();
  }

  function deleteRehearsal() {
    rehearsalPreview.pause(); rehearsalPreview.removeAttribute("src"); rehearsalPreview.load();
    if (rehearsalUrl) URL.revokeObjectURL(rehearsalUrl);
    rehearsalUrl = ""; show("rehearsal-result", false);
  }

  function releaseAnswer() {
    preview.pause(); preview.removeAttribute("src"); preview.load();
    if (answerUrl) URL.revokeObjectURL(answerUrl);
    answerUrl = ""; recordedBlob = null;
  }

  async function setAnswer(blob: Blob, mode: typeof videoMode, duration: number) {
    if (blob.size === 0) throw new Error("El video quedó vacío. Registra la falla técnica para usar la alternativa.");
    if (blob.size > config.maxVideoBytes) throw new Error(`El video supera el máximo de ${(config.maxVideoBytes / 1048576).toFixed(0)} MB. Registra la falla técnica si hubo un problema al grabar.`);
    releaseAnswer(); deleteRehearsal();
    recordedBlob = blob; videoMode = mode; uploadSession = null; answerUrl = URL.createObjectURL(blob);
    preview.src = answerUrl; cameraState = "answer";
    element("answer-details").textContent = `${Math.ceil(duration)} segundos · ${(blob.size / 1048576).toFixed(1)} MB`;
    show("video-result"); show("unuploaded-warning");
    element("camera-status").textContent = "Revisa tu video y guárdalo. La postulación se enviará cuando confirmes al final.";
    stopCamera(); updateControls();
    // The attempt is already counted by the server: keep the video in this browser so
    // closing the tab before it is uploaded does not lose it.
    answerPersisted = !!application && await saveAnswer({ applicationId: application.id, blob, mode, duration, failureCount: application.technicalFailureCount, savedAt: Date.now() });
    element("unuploaded-warning").textContent = answerPersisted
      ? "Tu video quedó guardado en este navegador. Si se cierra antes de subirlo, vuelve a esta página desde el mismo navegador para continuar sin grabar de nuevo."
      : "Conserva esta pestaña abierta hasta que termine la subida. Si la conexión falla, tu video seguirá aquí para volver a intentar.";
  }

  function capture(rehearsal: boolean) {
    if (!stream) throw new Error("Activa tu cámara y micrófono antes de grabar.");
    const mimeType = chooseRecordingMime(MediaRecorder);
    if (!mimeType) throw new Error("Tu navegador no tiene un formato de grabación compatible.");
    const chunks: BlobPart[] = [];
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1_500_000, audioBitsPerSecond: 64_000 });
    discardRecording = false; recordingStartedAt = performance.now();
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => { void interruptCapture("device", "La grabación presentó un error."); };
    recorder.onstop = () => {
      clearInterval(timer); show("recording-indicator", false); show("active-capture-banner", false);
      const duration = Math.min((performance.now() - recordingStartedAt) / 1000, rehearsal ? 10 : config.maxVideoSeconds);
      const blob = new Blob(chunks, { type: mimeType }); chunks.length = 0; recorder = null;
      if (discardRecording) { cameraState = stream ? "ready" : "idle"; updateControls(); return; }
      if (rehearsal) {
        deleteRehearsal(); rehearsalUrl = URL.createObjectURL(blob); rehearsalPreview.src = rehearsalUrl;
        show("rehearsal-result"); cameraState = "ready";
        element("camera-status").textContent = "Escucha tu ensayo. Se eliminará antes de grabar tu respuesta.";
        updateControls();
      } else { void setAnswer(blob, "recording", duration).catch(error => { cameraState = "idle"; showError(error); updateControls(); }); }
    };
    cameraState = rehearsal ? "rehearsal" : "recording";
    element("recording-label").textContent = rehearsal ? "Ensayo" : "Grabando";
    element("recording-timer").textContent = "00:00"; show("recording-indicator");
    show("active-capture-banner", !rehearsal);
    element("capture-banner-timer").textContent = `00:00 / ${clock(config.maxVideoSeconds)}`;
    recorder.start(1000);
    const limit = rehearsal ? 10 : config.maxVideoSeconds;
    // The server accepts limit + 0.25 s of real media. Stop early so stop latency and
    // the audio tail never cost the applicant their only attempt.
    const activeRecorder = recorder;
    const hardStop = setTimeout(() => { if (activeRecorder.state === "recording") activeRecorder.stop(); }, (limit - 0.75) * 1000);
    activeRecorder.addEventListener("stop", () => clearTimeout(hardStop), { once: true });
    timer = setInterval(() => {
      const seconds = Math.floor((performance.now() - recordingStartedAt) / 1000);
      element("recording-timer").textContent = clock(Math.min(seconds, limit));
      element("capture-banner-timer").textContent = `${clock(Math.min(seconds, limit))} / ${clock(config.maxVideoSeconds)}`;
    }, 100);
    element("camera-status").textContent = rehearsal ? "Ensayo en curso. Se detendrá a los 10 segundos." : `Responde tus cuatro preguntas. La grabación se detendrá a los ${limit} segundos.`;
    updateControls();
  }

  async function registerFailure(code: string, detail: string, keepalive = false) {
    if (!application) throw new Error("Guarda tus datos antes de registrar un problema técnico.");
    const result = await request<DraftResponse>(`/drafts/${application.id}/technical-failure`, "POST", { code, message: detail.slice(0, 500) }, true, keepalive);
    void forgetAnswer(application.id);
    // A registered technical failure retires the failed answer and its upload
    // capability. The one remaining attempt can now be a recording or a file.
    uploadSession = null; releaseAnswer(); show("video-result", false); show("upload-progress-panel", false);
    cameraState = stream ? "ready" : "idle";
    acceptApplication(result.application);
    element("camera-status").textContent = "La falla quedó registrada. Puedes volver a grabar o usar la carga alternativa una vez.";
  }

  async function interruptCapture(code: string, detail: string) {
    if (currentAttemptFailed) return;
    const evaluating = cameraState === "recording";
    currentAttemptFailed = true; discardRecording = true; clearInterval(timer);
    if (recorder && recorder.state !== "inactive") recorder.stop();
    stopCamera(); cameraState = "idle";
    element("camera-status").textContent = detail;
    if (evaluating) {
      // keepalive lets the report reach the server even when the tab is being closed.
      try { await registerFailure(code, detail, true); }
      catch (error) { showError(error); }
    }
    updateControls();
  }

  async function prepareAndRecord() {
    if (!stream || !application) throw new Error("Guarda tus datos y activa tu cámara antes de grabar.");
    deleteRehearsal(); clearError(); cameraState = "preparation"; updateControls();
    const deadline = performance.now() + config.preparationSeconds * 1000;
    const begin = async () => {
      clearInterval(preparationTimer);
      if (!stream || document.visibilityState === "hidden") { cameraState = stream ? "ready" : "idle"; updateControls(); return; }
      try {
        const result = await request<DraftResponse>(`/drafts/${application!.id}/recording-attempt`, "POST", {});
        acceptApplication(result.application); currentAttemptFailed = false; capture(false);
      } catch (error) { cameraState = "ready"; showError(error); updateControls(); }
    };
    const count = () => {
      const seconds = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
      element("camera-status").textContent = seconds ? `Preparación: ${seconds} segundos. Revisa las cuatro preguntas. La grabación comenzará al terminar.` : "Preparación terminada. Iniciando grabación…";
      if (seconds === 0) void begin();
    };
    preparationTimer = setInterval(count, 200); count();
  }

  async function fileDuration(file: Blob): Promise<number> {
    const video = document.createElement("video"); video.preload = "metadata"; video.muted = true;
    const url = URL.createObjectURL(file);
    try {
      return await new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("No pudimos comprobar la duración del archivo. Usa un video MP4 o WebM válido.")), 15000);
        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          if (!Number.isFinite(video.duration) || video.duration <= 0) reject(new Error("No pudimos comprobar la duración del archivo. Prueba exportarlo como MP4."));
          else resolve(video.duration);
        };
        video.onerror = () => { clearTimeout(timeout); reject(new Error("No pudimos abrir este video. Selecciona un MP4 o WebM válido.")); };
        video.src = url;
      });
    } finally { video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url); }
  }

  async function selectAlternate() {
    if (!application?.alternateAllowed) throw new Error("Primero registra una falla técnica para habilitar esta alternativa.");
    const file = element<HTMLInputElement>("alternate-file").files?.[0];
    if (!file) return;
    if (!["video/mp4", "video/webm"].includes(file.type)) throw new Error("Selecciona un video MP4 o WebM.");
    if (file.size > config.maxVideoBytes) throw new Error(`El archivo supera el límite de ${(config.maxVideoBytes / 1048576).toFixed(0)} MB. Reduce la calidad o el tamaño antes de subirlo.`);
    const duration = await fileDuration(file);
    if (duration > config.maxVideoSeconds) throw new Error(`Tu video dura ${Math.ceil(duration)} segundos. El máximo total es ${config.maxVideoSeconds} segundos.`);
    await setAnswer(file, "upload", duration);
  }

  function uploadPut(session: UploadSession, body: Blob | null, contentRange?: string, onProgress?: (loaded: number) => void): Promise<{ status: number }> {
    if (!isAllowedUploadUrl(session.uploadUrl, session.provider)) return Promise.reject(new Error("La dirección de carga no es válida. Conserva tu video y contacta al equipo de convocatoria."));
    return new Promise((resolve, reject) => {
      // Up to 20 MB in one request: allow slow mobile connections ten minutes.
      const xhr = new XMLHttpRequest(); xhr.open("PUT", session.uploadUrl); xhr.timeout = 600000;
      for (const [key, value] of Object.entries(session.headers ?? {})) {
        if (!["authorization", "cookie", "host", "content-type"].includes(key.toLowerCase())) xhr.setRequestHeader(key, value);
      }
      if (body) xhr.setRequestHeader("Content-Type", (body.type || recordedBlob!.type).split(";")[0]);
      if (contentRange) xhr.setRequestHeader("Content-Range", contentRange);
      xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress?.(event.loaded); };
      xhr.onerror = () => reject(new Error("La conexión se interrumpió. Tu video sigue en esta pestaña; vuelve a intentar guardarlo."));
      xhr.ontimeout = () => reject(new Error("La subida tardó demasiado. Conserva esta pestaña abierta y vuelve a intentarlo."));
      xhr.onload = () => {
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 308) resolve({ status: xhr.status });
        else reject(new Error(`No pudimos guardar el video (${xhr.status}). Conserva esta pestaña abierta y vuelve a intentarlo.`));
      };
      xhr.send(body);
    });
  }

  async function uploadVideo() {
    if (!recordedBlob || !application) throw new Error("Graba o selecciona tu video antes de guardarlo.");
    cameraState = "uploading"; updateControls(); show("upload-progress-panel");
    const blob = recordedBlob;
    const progress = element<HTMLProgressElement>("upload-progress");
    const updateProgress = (bytes: number) => {
      progress.value = Math.min(99, Math.round(bytes / blob.size * 100));
      element("upload-status").textContent = `Subiendo: ${progress.value} %. Mantén esta pestaña abierta.`;
    };
    try {
      // The server hands back the same live authorization for this attempt (or renews an
      // expired one), so a Drive upload resumes from its last confirmed byte.
      if (!uploadSession) uploadSession = await request<UploadSession>(`/drafts/${application.id}/video-session`, "POST", { mode: videoMode, contentType: blob.type.split(";")[0], bytes: blob.size });
      if (!isAllowedUploadUrl(uploadSession.uploadUrl, uploadSession.provider)) throw new Error("No pudimos preparar una carga segura. Tu video sigue disponible en esta pestaña.");
      if (uploadSession.provider === "drive") {
        // Google hides the resumable Range header from browsers (CORS), so the page cannot
        // continue mid-file. Videos are at most 20 MB: send the whole file, and before each
        // retry ask Google whether it already holds it (200/201) or still waits for it (308).
        const complete = async () => [200, 201].includes((await uploadPut(uploadSession!, null, `bytes */${blob.size}`)).status);
        for (let attempt = 0; !(await complete()); attempt++) {
          try { await uploadPut(uploadSession, blob, `bytes 0-${blob.size - 1}/${blob.size}`, updateProgress); break; }
          catch (error) {
            if (attempt >= 2) throw error;
            element("upload-status").textContent = `Reconectando para volver a enviar tu video (${attempt + 1}/2)…`;
            await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1500));
          }
        }
      } else await uploadPut(uploadSession, blob, undefined, updateProgress);
      element("upload-status").textContent = "Video subido. Estamos comprobando que el archivo esté completo y cumpla el tiempo permitido…";
      const verified = await request<DraftResponse>(`/drafts/${application.id}/video-complete`, "POST", { uploadId: uploadSession.uploadId });
      acceptApplication(verified.application);
      if (!verified.application.video) throw new Error("La comprobación del video sigue pendiente. Conserva esta pestaña e intenta nuevamente.");
      progress.value = 100; element("upload-status").textContent = "Tu video está guardado y verificado.";
      show("unuploaded-warning", false); uploadSession = null; dirty = false;
      message("Ya puedes confirmar el envío de tu postulación.");
    } catch (error) {
      // The storage service may have accepted the final bytes before the network
      // failed. Verify that same private file before asking the candidate to retry.
      if (uploadSession) {
        try {
          const recovered = await request<DraftResponse>(`/drafts/${application.id}/video-complete`, "POST", { uploadId: uploadSession.uploadId });
          if (recovered.application.video) {
            acceptApplication(recovered.application);
            progress.value = 100; element("upload-status").textContent = "Tu video está guardado y verificado.";
            show("unuploaded-warning", false); uploadSession = null; dirty = false;
            message("Ya puedes confirmar el envío de tu postulación."); return;
          }
        } catch { /* Keep the original file for a later retry. */ }
      }
      // Ask the server again on retry: a stale capability is replaced, a live one is reused.
      uploadSession = null;
      throw error;
    } finally { if (!application.video) cameraState = "answer"; updateControls(); }
  }

  /** Brings the applicant back to where they left off after closing the browser. */
  async function restoreProgress(open: boolean) {
    const cached = loadForm();
    if (!application) {
      if (cached && cached.id === null) { populateData(cached.data as ApplicationData); message("Recuperamos lo que escribiste en este navegador."); dirty = true; }
      return;
    }
    if (cached?.id === application.id && cached.pending) {
      // Changes typed just before the browser closed that did not reach the server.
      populateData({ ...application.data, ...cached.data, email: application.data.email } as ApplicationData);
      dirty = true; dataVersion++; // boot's finally block syncs it once restoring is done
    }
    const answer = application.video ? null : await loadAnswer(application.id);
    const usable = answer && answer.failureCount === application.technicalFailureCount ? answer : null;
    if (answer && !usable) void forgetAnswer(application.id);
    const startedVideo = !!application.video || application.recordingAttempts > 0 || application.technicalFailureCount > 0;
    if (!startedVideo && !usable && cached?.phase !== "video") return;
    setPhase("video", false);
    if (usable) {
      try {
        await setAnswer(usable.blob, usable.mode, usable.duration);
        message("Recuperamos tu video guardado en este navegador. Revísalo y pulsa «Guardar este video».");
      } catch (error) { void forgetAnswer(application.id); showError(error); }
      return;
    }
    if (application.video) { message("Tu video está guardado. Solo falta confirmar el envío de tu postulación."); return; }
    const exhausted = application.recordingAttempts >= (application.technicalFailureCount ? 2 : 1);
    if (!exhausted && application.technicalFailureCount) message("Tu grabación anterior se interrumpió y quedó registrada como falla técnica. Tienes un nuevo intento: vuelve a grabar o sube tu video.");
    else if (!exhausted) message("Retomaste tu postulación. Tus preguntas siguen siendo las mismas.");
    else if (!application.technicalFailureCount) {
      element<HTMLSelectElement>("failure-reason").value = "interrupted";
      message("Tu grabación anterior no llegó a guardarse. Registra la falla técnica para habilitar un nuevo intento.");
      element<HTMLDetailsElement>("technical-help").open = true;
      element("technical-help").scrollIntoView({ block: "center" });
    } else message("Ya utilizaste el reintento disponible y no encontramos tu video en este navegador. Escribe al equipo de convocatoria para revisar tu caso.");
  }

  async function boot() {
    try {
      const fragment = new URLSearchParams(location.hash.slice(1));
      const fragmentId = fragment.get("id"); const fragmentToken = fragment.get("token");
      let stored: { id?: string; token?: string } | null = null;
      if (fragmentToken) history.replaceState(null, "", location.pathname + location.search);
      if (fragmentId && fragmentToken) stored = { id: fragmentId, token: fragmentToken };
      else stored = loadSession();
      const result = await request<{ config: RecruitmentConfig; available: boolean; reason: string | null; developmentMode?: boolean; deploymentReady?: boolean; preview?: boolean }>("/config", "GET", undefined, false);
      show("development-notice", result.developmentMode === true || result.preview === true);
      if (result.preview) element("development-notice").textContent = "Modo de prueba: esta postulación es solo para probar y el equipo la borrará. No uses este enlace para tu postulación real.";
      else if (previewKey) { previewKey = ""; try { localStorage.removeItem(PREVIEW_KEY); } catch { /* Storage blocked. */ } }
      config = result.config;
      for (const id of ["firstChoiceArea", "secondChoiceArea"]) {
        const select = element<HTMLSelectElement>(id);
        for (const area of config.areas.filter(item => item.enabled)) { const option = document.createElement("option"); option.value = area.id; option.textContent = area.name; select.append(option); }
      }
      if (config.minAvailabilityHours) {
        element<HTMLInputElement>("availabilityHours").min = String(config.minAvailabilityHours);
        element("availability-hint").textContent = `Esta convocatoria requiere al menos ${config.minAvailabilityHours} horas por semana.`;
      }
      element("video-instructions").textContent = `Responde las 4 preguntas en un solo video de hasta ${config.maxVideoSeconds} segundos.`;
      element("preparation-instructions").textContent = `Antes de grabar tendrás ${config.preparationSeconds} segundos para prepararte. El ensayo no se envía.`;
      element("alternate-limit").textContent = `MP4 o WebM. Hasta ${config.maxVideoSeconds} segundos y ${(config.maxVideoBytes / 1048576).toFixed(0)} MB.`;
      if (stored?.id && stored.token && /^[a-zA-Z0-9_-]{10,100}$/.test(stored.id) && stored.token.length <= 512) {
        resumeToken = stored.token;
        try {
          const resumed = await request<DraftResponse>(`/drafts/${encodeURIComponent(stored.id)}`);
          acceptApplication(resumed.application, true); rememberSession();
        } catch (error) {
          resumeToken = "";
          // Only forget a link the server rejected, never because of a network failure.
          if (/inválido|no autorizado/i.test(errorMessage(error))) void forgetEverything();
          showError(error);
        }
      }
      const alreadySubmitted = application !== null && !!application.submittedAt;
      const endedDraft = application !== null && !alreadySubmitted && application.status === "expired";
      show("recruitment-flow", (result.available && !endedDraft) || alreadySubmitted);
      show("recruitment-closed", (!result.available || endedDraft) && !alreadySubmitted);
      if (endedDraft) {
        element("closed-heading").textContent = "Este borrador no llegó a enviarse";
        element("closed-reason").textContent = "El plazo para completar esta postulación terminó. Consulta con el equipo de convocatoria para conocer las próximas oportunidades.";
        message("Tu postulación no está confirmada.");
      } else if (!result.available && !alreadySubmitted) {
        element("closed-reason").textContent = result.reason || "Te avisaremos cuando comience la siguiente convocatoria.";
        const opensIn = config.enabled && config.opensAt ? Date.parse(config.opensAt) - Date.now() : NaN;
        if (opensIn > 0 && result.deploymentReady !== false) {
          const opens = Date.parse(config.opensAt!);
          const when = `${new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", weekday: "long", day: "numeric", month: "long" }).format(opens).replace(",", "")} a las ${new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "numeric", minute: "2-digit" }).format(opens)}`;
          element("closed-heading").textContent = "La convocatoria abre pronto";
          element("closed-reason").textContent = `Las postulaciones abren el ${when} (hora de Lima). Deja esta página abierta: se habilitará sola.`;
          // setTimeout cannot wait longer than ~24.8 days; nobody keeps a tab open that long.
          if (opensIn < 2 ** 31 - 1) setTimeout(() => location.reload(), opensIn + 1500);
        }
        message(application ? "Tu borrador sigue guardado, pero la convocatoria no permite nuevos envíos por ahora." : "Consulta las próximas novedades en la página de convocatoria.");
      } else if (!alreadySubmitted) message(application ? "Retomaste tu borrador. Revisa tus datos antes de continuar." : "Empieza con tus datos. Puedes guardar y continuar después.");
      callOpen = result.available && !endedDraft;
      if (!alreadySubmitted && !endedDraft) await restoreProgress(result.available);
    } catch (error) {
      message("No pudimos consultar la convocatoria. Recarga la página para volver a intentar."); showError(error);
    } finally {
      restored = true; root!.setAttribute("aria-busy", "false"); updateControls();
      if (dirty && callOpen) scheduleAutosave();
    }
  }

  form.addEventListener("input", () => { dirty = true; dataVersion++; rememberForm(); scheduleAutosave(); });
  form.addEventListener("change", () => { dirty = true; dataVersion++; rememberForm(); scheduleAutosave(); });
  element<HTMLSelectElement>("secondChoiceArea").addEventListener("change", validateAreas);
  element<HTMLSelectElement>("firstChoiceArea").addEventListener("change", validateAreas);
  function validateAreas() {
    const first = element<HTMLSelectElement>("firstChoiceArea"); const second = element<HTMLSelectElement>("secondChoiceArea");
    second.setCustomValidity(second.value && first.value === second.value ? "Elige una segunda área diferente de tu primera opción." : "");
  }
  /** Friendly inline errors instead of the browser's validation bubbles. */
  type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
  function fieldMessage(control: Control): string {
    const v = control.validity;
    if (control.type === "checkbox") return "Marca esta casilla para continuar.";
    if (v.valueMissing) return control instanceof HTMLSelectElement ? "Elige una opción." : "Completa este campo.";
    if (v.customError) return control.validationMessage;
    if (control.id === "email") return "Revisa tu correo, parece incompleto.";
    if (control.id === "phone") return "Escribe los 9 dígitos de tu celular.";
    if (control.id === "admissionTerm") return "Usa el formato año-semestre, por ejemplo 2024-2.";
    if (control.id === "availabilityHours") return "Escribe un número de horas válido.";
    return "Revisa este campo.";
  }
  function setFieldError(control: Control, text: string) {
    const holder = control.closest<HTMLElement>(".field, .consent");
    if (!holder) return;
    let note = holder.querySelector<HTMLElement>(".field-error");
    if (!text) { control.removeAttribute("aria-invalid"); control.removeAttribute("aria-errormessage"); holder.classList.remove("invalid"); note?.remove(); return; }
    if (!note) { note = document.createElement("p"); note.className = "field-error"; note.id = `${control.id}-error`; holder.append(note); }
    note.textContent = text;
    control.setAttribute("aria-invalid", "true"); control.setAttribute("aria-errormessage", note.id); holder.classList.add("invalid");
  }
  function showFieldErrors(): boolean {
    const controls = [...form.querySelectorAll<Control>("input, select, textarea")].filter(control => control.id);
    const invalid = controls.filter(control => !control.checkValidity());
    for (const control of controls) setFieldError(control, invalid.includes(control) ? fieldMessage(control) : "");
    if (!invalid.length) return true;
    invalid[0].focus({ preventScroll: true });
    invalid[0].closest(".field, .consent")?.scrollIntoView({ block: "center", behavior: "smooth" });
    message(invalid.length === 1 ? "Falta completar un campo." : `Faltan completar ${invalid.length} campos.`);
    return false;
  }
  for (const type of ["input", "change"]) form.addEventListener(type, event => {
    const control = event.target as Control;
    if (control.getAttribute("aria-invalid") === "true" && control.checkValidity()) setFieldError(control, "");
  });
  element("email").addEventListener("blur", scheduleAutosave);
  window.addEventListener("online", scheduleAutosave);
  form.addEventListener("submit", event => {
    event.preventDefault(); validateAreas(); if (!showFieldErrors()) return;
    void runAction(async () => { clearTimeout(autosaveTimer); await saveDraft(); if (dirty) await saveDraft(); setPhase("video"); rememberForm(); message(""); });
  });
  button("edit-data").addEventListener("click", () => { stopCamera(); setPhase("data"); rememberForm(); cameraState = application?.video ? "saved" : recordedBlob ? "answer" : "idle"; updateControls(); });
  button("forget-device").addEventListener("click", () => {
    if (!confirm("Se borrará de este navegador tu avance y tu video sin subir. Podrás continuar solo con tu enlace personal. ¿Continuar?")) return;
    void forgetEverything().then(cleared => {
      if (cleared) location.replace("/postular");
      else alert("No pudimos borrar todo de este navegador. Borra los datos del sitio desde la configuración del navegador.");
    });
  });
  button("copy-resume").addEventListener("click", () => { void runAction(async () => {
    if (!application || !resumeToken) return;
    const url = `${location.origin}/postular#${new URLSearchParams({ id: application.id, token: resumeToken })}`;
    try { await navigator.clipboard.writeText(url); message("Enlace personal copiado. Guárdalo en un lugar seguro y no lo compartas."); }
    catch { const input = document.createElement("input"); input.value = url; input.readOnly = true; input.setAttribute("aria-label", "Tu enlace personal. Cópialo y guárdalo."); element("resume-panel").append(input); input.select(); message("Selecciona y copia tu enlace personal para guardarlo."); }
  }); });
  button("test-camera").addEventListener("click", () => { void runAction(enableCamera); });
  button("rehearse").addEventListener("click", () => { currentAttemptFailed = false; clearError(); try { capture(true); } catch (error) { showError(error); } });
  button("discard-rehearsal").addEventListener("click", deleteRehearsal);
  button("start-recording").addEventListener("click", () => { void prepareAndRecord().catch(showError); });
  button("stop-recording").addEventListener("click", () => { if (recorder?.state === "recording") recorder.stop(); });
  button("finish-capture").addEventListener("click", () => { if (recorder?.state === "recording") recorder.stop(); });
  button("report-failure").addEventListener("click", () => { void runAction(async () => {
    const select = element<HTMLSelectElement>("failure-reason");
    if (!select.value) throw new Error("Selecciona el problema técnico que ocurrió.");
    await registerFailure(select.value, select.selectedOptions[0].textContent || "Falla técnica reportada");
  }); });
  element<HTMLInputElement>("alternate-file").addEventListener("change", () => { void runAction(selectAlternate); });
  button("upload-video").addEventListener("click", () => { void runAction(uploadVideo); });
  button("submit-application").addEventListener("click", () => { void runAction(async () => {
    if (!application?.video) throw new Error("Guarda y verifica tu video antes de confirmar.");
    const result = await request<DraftResponse>(`/drafts/${application.id}/submit`, "POST", {});
    if (!result.application.submittedAt) throw new Error("Tu postulación aún no está confirmada. Intenta nuevamente.");
    acceptApplication(result.application); dirty = false; setPhase("complete"); message("Postulación enviada correctamente.");
    await forgetEverything();
  }); });
  /** Last chance to keep unsaved typing when the tab is closed or the phone suspends it. */
  function flushOnExit() {
    rememberForm();
    if (!dirty || !application || !resumeToken || !["draft", "incomplete"].includes(application.status)) return;
    clearTimeout(autosaveTimer);
    void request(`/drafts/${application.id}`, "PATCH", collectData(), true, true).catch(() => undefined);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushOnExit();
    if (document.visibilityState === "hidden" && (cameraState === "recording" || cameraState === "rehearsal")) void interruptCapture("interrupted", "La grabación se interrumpió al salir de esta pestaña.");
    if (document.visibilityState === "hidden" && cameraState === "preparation") { clearInterval(preparationTimer); cameraState = "ready"; element("camera-status").textContent = "La preparación se pausó al salir de la pestaña. Vuelve a iniciarla cuando estés listo/a."; updateControls(); }
  });
  window.addEventListener("beforeunload", event => { if (dirty || (recordedBlob && !answerPersisted) || ["preparation", "recording", "uploading"].includes(cameraState)) event.preventDefault(); });
  window.addEventListener("pagehide", () => { flushOnExit(); clearInterval(timer); clearInterval(preparationTimer); stopCamera(); deleteRehearsal(); if (answerUrl) URL.revokeObjectURL(answerUrl); });
  void boot();
}
