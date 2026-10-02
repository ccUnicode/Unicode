import type { ApplicationData, RecruitmentApplication, RecruitmentConfig } from "../lib/recruitment/types";

type UploadSession = {
  uploadId: string; provider: "drive" | "supabase"; fileId: string;
  uploadUrl: string; method: "PUT"; headers?: Record<string, string>;
};
type CameraState = "idle" | "ready" | "rehearsal" | "preparation" | "recording" | "answer" | "uploading" | "saved";
type DraftResponse = { application: RecruitmentApplication; resumeToken?: string };
const SESSION_KEY = "unicode-recruitment-session";
const FORM_FIELDS = ["firstName", "lastName", "email", "phone", "university", "faculty", "career", "admissionTerm", "semester", "firstChoiceArea", "secondChoiceArea", "availabilityHours", "motivation", "shortCase", "consent"] as const;

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
  const camera = element<HTMLVideoElement>("camera-preview");
  const preview = element<HTMLVideoElement>("answer-preview");
  const rehearsalPreview = element<HTMLVideoElement>("rehearsal-preview");
  let config: RecruitmentConfig;
  let application: RecruitmentApplication | null = null;
  let resumeToken = "";
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

  async function request<T>(path: string, method = "GET", body?: unknown, authenticated = true): Promise<T> {
    const response = await fetch(`/api/recruitment${path}`, {
      method, cache: "no-store", credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", ...(authenticated && resumeToken ? { Authorization: `Bearer ${resumeToken}` } : {}) },
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
    if (next !== "data") clearTimeout(autosaveTimer);
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
    const categories = { motivation: "Motivación y calce cultural", collaboration: "Colaboración y resolución de problemas" };
    for (const [category, title] of Object.entries(categories)) {
      const group = document.createElement("div"); group.className = "question-group";
      const heading = document.createElement("h3"); heading.textContent = title;
      const list = document.createElement("ol");
      for (const question of application?.questions.filter(item => item.category === category) ?? []) {
        const item = document.createElement("li"); item.textContent = question.text; list.append(item);
      }
      group.append(heading, list); target.append(group);
    }
  }

  function acceptApplication(next: RecruitmentApplication, populate = false) {
    application = next;
    element<HTMLInputElement>("email").readOnly = true;
    element<HTMLInputElement>("email").value = next.data.email;
    if (populate) populateData(next.data);
    renderQuestions();
    show("resume-panel", !!resumeToken && ["draft", "incomplete"].includes(next.status));
    if (next.video) { cameraState = "saved"; releaseAnswer(); show("video-result", false); }
    if (next.submittedAt) {
      element("application-reference").textContent = `Referencia: ${next.id}`;
      setPhase("complete", populate);
      message("Tu postulación ya fue enviada.");
    }
    updateControls();
  }

  function rememberSession() {
    if (!application || !resumeToken) return;
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: application.id, token: resumeToken })); } catch { /* Personal resume link still works if browser storage is disabled. */ }
  }

  async function saveDraft() {
    if (savePromise) { await savePromise; if (!dirty) return; }
    const version = dataVersion;
    const data = collectData();
    savePromise = (async () => {
      button("save-draft").disabled = true; button("continue-video").disabled = true;
      element("save-status").textContent = "Guardando tu avance…";
      const result = application
        ? await request<DraftResponse>(`/drafts/${application.id}`, "PATCH", data)
        : await request<DraftResponse>("/drafts", "POST", data, false);
      if (result.resumeToken) resumeToken = result.resumeToken;
      acceptApplication(result.application);
      rememberSession();
      dirty = dataVersion !== version;
      element("save-status").textContent = dirty ? "Cambios recientes pendientes de guardar." : "Tu avance está guardado. Puedes conservar tu enlace personal.";
      if (dirty) scheduleAutosave();
    })();
    try { await savePromise; }
    finally { savePromise = null; button("save-draft").disabled = false; button("continue-video").disabled = false; }
  }

  function validateDraftIdentity() {
    for (const id of ["firstName", "lastName", "email", "consent"]) {
      if (!element<HTMLInputElement>(id).reportValidity()) return false;
    }
    return true;
  }

  function scheduleAutosave() {
    clearTimeout(autosaveTimer);
    if (!application || phase !== "data") return;
    autosaveTimer = setTimeout(() => { void saveDraft().catch(error => { element("save-status").textContent = `No pudimos guardar el último cambio. ${errorMessage(error)}`; }); }, 1200);
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
    timer = setInterval(() => {
      const seconds = Math.floor((performance.now() - recordingStartedAt) / 1000);
      element("recording-timer").textContent = clock(Math.min(seconds, limit));
      element("capture-banner-timer").textContent = `${clock(Math.min(seconds, limit))} / ${clock(config.maxVideoSeconds)}`;
      if (seconds >= limit && recorder?.state === "recording") recorder.stop();
    }, 100);
    element("camera-status").textContent = rehearsal ? "Ensayo en curso. Se detendrá a los 10 segundos." : `Responde tus cuatro preguntas. La grabación se detendrá a los ${limit} segundos.`;
    updateControls();
  }

  async function registerFailure(code: string, detail: string) {
    if (!application) throw new Error("Guarda tus datos antes de registrar un problema técnico.");
    const result = await request<DraftResponse>(`/drafts/${application.id}/technical-failure`, "POST", { code, message: detail.slice(0, 500) });
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
      try { await registerFailure(code, detail); }
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

  function uploadPut(session: UploadSession, body: Blob | null, contentRange?: string, onProgress?: (loaded: number) => void): Promise<{ status: number; range: string | null }> {
    if (!isAllowedUploadUrl(session.uploadUrl, session.provider)) return Promise.reject(new Error("La dirección de carga no es válida. Conserva tu video y contacta al equipo de convocatoria."));
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest(); xhr.open("PUT", session.uploadUrl); xhr.timeout = 120000;
      for (const [key, value] of Object.entries(session.headers ?? {})) {
        if (!["authorization", "cookie", "host", "content-type"].includes(key.toLowerCase())) xhr.setRequestHeader(key, value);
      }
      if (body) xhr.setRequestHeader("Content-Type", (body.type || recordedBlob!.type).split(";")[0]);
      if (contentRange) xhr.setRequestHeader("Content-Range", contentRange);
      xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress?.(event.loaded); };
      xhr.onerror = () => reject(new Error("La conexión se interrumpió. Tu video sigue en esta pestaña; vuelve a intentar guardarlo."));
      xhr.ontimeout = () => reject(new Error("La subida tardó demasiado. Conserva esta pestaña abierta y vuelve a intentarlo."));
      xhr.onload = () => {
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 308) resolve({ status: xhr.status, range: xhr.getResponseHeader("Range") });
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
      if (!uploadSession) uploadSession = await request<UploadSession>(`/drafts/${application.id}/video-session`, "POST", { mode: videoMode, contentType: blob.type.split(";")[0], bytes: blob.size });
      if (!isAllowedUploadUrl(uploadSession.uploadUrl, uploadSession.provider)) throw new Error("No pudimos preparar una carga segura. Tu video sigue disponible en esta pestaña.");
      if (uploadSession.provider === "drive") {
        const state = await uploadPut(uploadSession, null, `bytes */${blob.size}`);
        let offset = state.status === 308 ? Number(state.range?.match(/bytes=0-(\d+)/)?.[1] ?? -1) + 1 : blob.size;
        const chunkSize = 4 * 1024 * 1024;
        let retries = 0;
        while (offset < blob.size) {
          const end = Math.min(offset + chunkSize, blob.size);
          const chunk = blob.slice(offset, end, blob.type);
          try {
            const response = await uploadPut(uploadSession, chunk, `bytes ${offset}-${end - 1}/${blob.size}`, loaded => updateProgress(offset + loaded));
            const nextOffset = response.status === 308 ? Number(response.range?.match(/bytes=0-(\d+)/)?.[1] ?? -1) + 1 : blob.size;
            if (nextOffset <= offset || nextOffset > blob.size) throw new Error("No pudimos confirmar la parte subida del video. Conserva esta pestaña y vuelve a intentarlo.");
            offset = nextOffset; retries = 0;
          } catch (error) {
            retries++;
            if (retries > 3) throw error;
            element("upload-status").textContent = `Reconectando para continuar la subida (${retries}/3)…`;
            await new Promise(resolve => setTimeout(resolve, retries * 700));
            const resumed = await uploadPut(uploadSession, null, `bytes */${blob.size}`);
            const nextOffset = resumed.status === 308 ? Number(resumed.range?.match(/bytes=0-(\d+)/)?.[1] ?? -1) + 1 : blob.size;
            if (nextOffset < offset || nextOffset > blob.size) throw new Error("No pudimos confirmar el avance de la carga. Conserva esta pestaña y vuelve a intentarlo.");
            offset = nextOffset;
          }
          updateProgress(offset);
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
        } catch { /* Keep the original file and session for a later retry. */ }
      }
      throw error;
    } finally { if (!application.video) cameraState = "answer"; updateControls(); }
  }

  async function boot() {
    try {
      const fragment = new URLSearchParams(location.hash.slice(1));
      const fragmentId = fragment.get("id"); const fragmentToken = fragment.get("token");
      let stored: { id?: string; token?: string } | null = null;
      if (fragmentToken) history.replaceState(null, "", location.pathname + location.search);
      if (fragmentId && fragmentToken) stored = { id: fragmentId, token: fragmentToken };
      else { try { stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch { /* No usable stored session. */ } }
      const result = await request<{ config: RecruitmentConfig; available: boolean; reason: string | null; developmentMode?: boolean }>("/config", "GET", undefined, false);
      show("development-notice", result.developmentMode === true);
      config = result.config;
      for (const id of ["firstChoiceArea", "secondChoiceArea"]) {
        const select = element<HTMLSelectElement>(id);
        for (const area of config.areas.filter(item => item.enabled)) { const option = document.createElement("option"); option.value = area.id; option.textContent = area.name; select.append(option); }
      }
      if (config.minAvailabilityHours !== null) {
        element<HTMLInputElement>("availabilityHours").min = String(config.minAvailabilityHours);
        element("availability-hint").textContent = `Esta convocatoria requiere al menos ${config.minAvailabilityHours} horas por semana.`;
      }
      element("short-case-prompt").textContent = config.shortCasePrompt;
      element("video-instructions").textContent = `Responde las cuatro preguntas en un solo video de hasta ${config.maxVideoSeconds} segundos en total. Las preguntas se mantienen al volver a entrar.`;
      element("preparation-instructions").textContent = `Tendrás ${config.preparationSeconds} segundos de preparación al iniciar. El contador de tu respuesta comenzará después.`;
      element("alternate-limit").textContent = `MP4 o WebM. Hasta ${config.maxVideoSeconds} segundos y ${(config.maxVideoBytes / 1048576).toFixed(0)} MB.`;
      if (stored?.id && stored.token && /^[a-zA-Z0-9_-]{10,100}$/.test(stored.id) && stored.token.length <= 512) {
        resumeToken = stored.token;
        try {
          const resumed = await request<DraftResponse>(`/drafts/${encodeURIComponent(stored.id)}`);
          acceptApplication(resumed.application, true); rememberSession();
        } catch (error) {
          resumeToken = "";
          try { sessionStorage.removeItem(SESSION_KEY); } catch { /* Storage unavailable. */ }
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
        message(application ? "Tu borrador sigue guardado, pero la convocatoria no permite nuevos envíos por ahora." : "Consulta las próximas novedades en la página de convocatoria.");
      } else if (!alreadySubmitted) message(application ? "Retomaste tu borrador. Revisa tus datos antes de continuar." : "Empieza con tus datos. Puedes guardar y continuar después.");
    } catch (error) {
      message("No pudimos consultar la convocatoria. Recarga la página para volver a intentar."); showError(error);
    } finally { root!.setAttribute("aria-busy", "false"); updateControls(); }
  }

  form.addEventListener("input", () => { dirty = true; dataVersion++; scheduleAutosave(); });
  form.addEventListener("change", () => { dirty = true; dataVersion++; scheduleAutosave(); });
  element<HTMLSelectElement>("secondChoiceArea").addEventListener("change", validateAreas);
  element<HTMLSelectElement>("firstChoiceArea").addEventListener("change", validateAreas);
  function validateAreas() {
    const first = element<HTMLSelectElement>("firstChoiceArea"); const second = element<HTMLSelectElement>("secondChoiceArea");
    second.setCustomValidity(second.value && first.value === second.value ? "Elige una segunda área diferente de tu primera opción." : "");
  }
  button("save-draft").addEventListener("click", () => { if (validateDraftIdentity()) void runAction(saveDraft); });
  form.addEventListener("submit", event => {
    event.preventDefault(); validateAreas(); if (!form.reportValidity()) return;
    void runAction(async () => { clearTimeout(autosaveTimer); await saveDraft(); if (dirty) await saveDraft(); setPhase("video"); message("Tus preguntas ya están asignadas. Responde las cuatro en un solo video."); });
  });
  button("edit-data").addEventListener("click", () => { stopCamera(); setPhase("data"); cameraState = application?.video ? "saved" : recordedBlob ? "answer" : "idle"; updateControls(); });
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
  }); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && (cameraState === "recording" || cameraState === "rehearsal")) void interruptCapture("interrupted", "La grabación se interrumpió al salir de esta pestaña.");
    if (document.visibilityState === "hidden" && cameraState === "preparation") { clearInterval(preparationTimer); cameraState = "ready"; element("camera-status").textContent = "La preparación se pausó al salir de la pestaña. Vuelve a iniciarla cuando estés listo/a."; updateControls(); }
  });
  window.addEventListener("beforeunload", event => { if (dirty || recordedBlob || cameraState === "recording") event.preventDefault(); });
  window.addEventListener("pagehide", () => { clearInterval(timer); clearInterval(preparationTimer); stopCamera(); deleteRehearsal(); if (answerUrl) URL.revokeObjectURL(answerUrl); });
  void boot();
}
