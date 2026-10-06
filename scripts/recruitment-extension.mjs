/** One-time extension campaign. Preview by default; --send requires explicit authorization. */
import { createServer } from 'vite';
import { mkdir, readFile, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const send = process.argv.includes('--send');
const base = process.env.PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !secret) throw new Error('Falta configurar Supabase. Usa node --env-file=.env.');
const headers = { apikey: secret, Authorization: `Bearer ${secret}` };
async function read(path) {
  const response = await fetch(`${base}/rest/v1/${path}`, { headers, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Lectura de Supabase rechazada (${response.status}).`);
  return response.json();
}
function eligible(app) {
  return !app.is_test && !app.reminders_off && !app.submitted_at
    && ['draft', 'incomplete', 'expired'].includes(app.status);
}
const [config] = await read('recruitment_config?select=settings,revision');
const settings = config.settings;
const deadline = settings.extensionAt || settings.closesAt;
if (!settings.enabled || Date.parse(settings.opensAt) > Date.now() || !Number.isFinite(Date.parse(deadline)) || Date.parse(deadline) <= Date.now()) {
  throw new Error('La convocatoria no está abierta. No se enviaron correos.');
}
const siteUrl = (process.env.RECRUITMENT_BASE_URL || 'https://www.ccunicode.org').replace(/\/+$/, '');
const campaign = `extension-${createHash('sha256').update(deadline).digest('hex').slice(0, 12)}`;
const logPath = `.recruitment-local/${campaign}.jsonl`;
let previous = [];
try { previous = (await readFile(logPath, 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line)); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const attempted = new Set(previous.map(row => row.id));
const attemptedEmails = new Set(previous.map(row => row.to));
const apps = await read('recruitment_applications?select=id,status,is_test,reminders_off,submitted_at,data,video&order=created_at.asc&limit=1000');
if (apps.length === 1000) throw new Error('La lista requiere paginación. No se enviaron correos.');
const outbox = await read('recruitment_email_outbox?select=application_id,payload&template_key=eq.resume&limit=1000');
if (outbox.length === 1000) throw new Error('Los enlaces requieren paginación. No se enviaron correos.');
const cryptoKey = await crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', new TextEncoder().encode(process.env.RECRUITMENT_RESUME_ENCRYPTION_KEY)), { name: 'AES-GCM' }, false, ['decrypt']);
const deadlineMinute = new Date(Date.parse(deadline) - 60_000);
const date = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long' }).format(deadlineMinute).replace(',', '');
const time = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(deadlineMinute);
const deadlineLabel = `${date}, a las ${time}`;
const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const { extensionPendingSteps, extensionEmailText } = await server.ssrLoadModule('/src/lib/recruitment-extension-email.ts');
  const { renderRecruitmentEmailHtml } = await server.ssrLoadModule('/src/lib/recruitment-email-layout.ts');
  const { sendRecruitmentEmail } = await server.ssrLoadModule('/src/lib/recruitment-email.ts');
  const { unsubscribeUrl } = await server.ssrLoadModule('/src/lib/unsubscribe.ts');
  const seenEmails = new Set();
  const prepared = [];
  for (const app of apps.filter(eligible)) {
    const to = app.data.email?.trim().toLowerCase();
    if (!to || seenEmails.has(to) || attempted.has(app.id) || attemptedEmails.has(to)) continue;
    seenEmails.add(to);
    const encrypted = outbox.find(row => row.application_id === app.id)?.payload?.resumeSecret;
    if (!encrypted) throw new Error(`Falta el enlace personal de ${app.id}. No se inició el envío.`);
    const [iv, bytes] = encrypted.split('.');
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Buffer.from(iv, 'base64url') }, cryptoKey, Buffer.from(bytes, 'base64url'));
    const resumeUrl = new TextDecoder().decode(decrypted);
    const link = new URL(resumeUrl);
    if (link.origin !== new URL(siteUrl).origin || link.pathname !== '/postular' || new URLSearchParams(link.hash.slice(1)).get('id') !== app.id) {
      throw new Error(`Enlace personal inválido para ${app.id}. No se inició el envío.`);
    }
    const steps = extensionPendingSteps({ data: app.data, hasVideo: Boolean(app.video), minAvailabilityHours: settings.minAvailabilityHours, areas: settings.areas });
    prepared.push({ app, to, resumeUrl, steps });
  }
  console.log(JSON.stringify({ mode: send ? 'send' : 'preview', campaign, deadlineLabel, recipients: prepared.length, previousAttempts: attempted.size }));
  if (send) await mkdir('.recruitment-local', { recursive: true });
  let accepted = 0;
  let failed = 0;
  let skipped = 0;
  for (const item of prepared) {
    if (!send) { console.log(JSON.stringify({ to: item.to, name: item.app.data.firstName, steps: item.steps })); continue; }
    const [currentConfig] = await read('recruitment_config?select=settings,revision');
    if (currentConfig.revision !== config.revision || Date.now() >= Date.parse(deadline)) throw new Error('La convocatoria cambió. Se detuvo el envío.');
    const [current] = await read(`recruitment_applications?id=eq.${item.app.id}&select=id,status,is_test,reminders_off,submitted_at,data,video`);
    if (!current || !eligible(current) || current.data.email?.trim().toLowerCase() !== item.to) { skipped++; continue; }
    const steps = extensionPendingSteps({ data: current.data, hasVideo: Boolean(current.video), minAvailabilityHours: settings.minAvailabilityHours, areas: settings.areas });
    const subject = '¡La convocatoria de UNICODE ha sido ampliada!';
    const text = extensionEmailText({ firstName: current.data.firstName, steps, resumeUrl: item.resumeUrl, deadlineLabel });
    const optOut = await unsubscribeUrl(siteUrl, current.id);
    const html = renderRecruitmentEmailHtml({ subject, text, actionUrl: item.resumeUrl, siteUrl, unsubscribeUrl: optOut });
    const audit = { campaign, id: current.id, to: item.to, at: new Date().toISOString() };
    // A started attempt is never silently retried: Gmail lacks provider idempotency.
    await appendFile(logPath, JSON.stringify({ ...audit, status: 'started' }) + '\n');
    try {
      const result = await sendRecruitmentEmail({ to: item.to, subject, text: `${text}\n\nDejar de recibir recordatorios o retirar postulación: ${optOut}`, html, idempotencyKey: `${campaign}-${current.id}`, headers: { 'List-Unsubscribe': `<${optOut}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } });
      await appendFile(logPath, JSON.stringify({ ...audit, status: 'accepted', messageId: result.messageId }) + '\n');
      console.log(JSON.stringify({ to: item.to, status: 'accepted', messageId: result.messageId }));
      accepted++;
    } catch {
      await appendFile(logPath, JSON.stringify({ ...audit, status: 'needs_review' }) + '\n');
      console.log(JSON.stringify({ to: item.to, status: 'needs_review' }));
      failed++;
    }
    await new Promise(resolve => setTimeout(resolve, 650));
  }
  console.log(JSON.stringify({ accepted, failed, skipped, ...(send ? { logPath } : {}) }));
  if (failed) process.exitCode = 1;
} finally { await server.close(); }
