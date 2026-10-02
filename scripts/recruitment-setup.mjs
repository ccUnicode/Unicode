/**
 * Recruitment activation helper. Run from the repository root:
 *
 *   npm run recruitment -- secrets   generate encryption key, cron secret and base URL in .env
 *   npm run recruitment -- google    authorize Drive + Gmail and create the private video folder
 *   npm run recruitment -- check     read-only verification of every integration
 *   npm run recruitment -- check --send-test=you@example.com   also send one test email
 *   npm run recruitment -- vercel    copy the server variables from .env to Vercel (production)
 *   npm run recruitment -- github    enable the 5-minute email worker (after Vercel is deployed)
 *
 * Values are written to .env (git-ignored) and never printed in full.
 */
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';

const ENV_FILE = '.env';
const SERVER_VARIABLES = [
  'PUBLIC_SUPABASE_URL', 'PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_PASSWORD', 'RECRUITMENT_BASE_URL', 'RECRUITMENT_RESUME_ENCRYPTION_KEY',
  'CRON_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'DRIVE_VIDEO_FOLDER_ID',
  'RECRUITMENT_EMAIL_PROVIDER', 'RECRUITMENT_EMAIL_FROM', 'RESEND_API_KEY', 'RECRUITMENT_VIDEO_BUCKET',
];

function readEnv() {
  const values = {};
  if (!existsSync(ENV_FILE)) return values;
  for (const line of readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return values;
}
function writeEnv(changes) {
  let text = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8') : '';
  for (const [name, value] of Object.entries(changes)) {
    const line = `${name}=${value}`;
    const pattern = new RegExp(`^\\s*${name}\\s*=.*$`, 'm');
    text = pattern.test(text) ? text.replace(pattern, line) : `${text.replace(/\s*$/, '')}\n${line}\n`;
  }
  writeFileSync(ENV_FILE, text.replace(/^\n/, ''), { mode: 0o600 });
}
const env = readEnv();
const mask = (value) => (value ? `${value.slice(0, 6)}…(${value.length})` : '(vacío)');
const ok = (text) => console.log(`  ✔ ${text}`);
const fail = (text, fix) => { console.log(`  ✖ ${text}${fix ? `\n      → ${fix}` : ''}`); failures++; };
const warn = (text) => console.log(`  ! ${text}`);
let failures = 0;

async function secrets() {
  const changes = {};
  if ((env.RECRUITMENT_RESUME_ENCRYPTION_KEY || '').length < 32) changes.RECRUITMENT_RESUME_ENCRYPTION_KEY = randomBytes(32).toString('base64url');
  if ((env.CRON_SECRET || '').length < 32) changes.CRON_SECRET = randomBytes(32).toString('base64url');
  if (!env.RECRUITMENT_BASE_URL) changes.RECRUITMENT_BASE_URL = 'https://www.ccunicode.org/';
  if (!env.ADMIN_PASSWORD) console.log('  ! Falta ADMIN_PASSWORD: usa la misma contraseña del panel /admin que ya está en Vercel.');
  writeEnv(changes);
  for (const name of Object.keys(changes)) ok(`${name} → ${name === 'RECRUITMENT_BASE_URL' ? changes[name] : mask(changes[name])}`);
  if (!Object.keys(changes).length) ok('Las claves ya existían; no se cambió nada (cambiarlas invalidaría enlaces ya enviados).');
}

async function google() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    console.log('Falta GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET en .env. Ver docs/convocatoria-operacion.md → «Autorizar Google».');
    process.exit(1);
  }
  const verifier = randomBytes(48).toString('base64url');
  const state = randomBytes(16).toString('base64url');
  const scopes = ['openid', 'email', 'https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/gmail.send'];
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const redirectUri = `http://127.0.0.1:${server.address().port}`;
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri, response_type: 'code', scope: scopes.join(' '),
    access_type: 'offline', prompt: 'consent', state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256',
  })}`;
  console.log('\nAbre este enlace en el perfil de Brave con la cuenta de Google de UNICODE y acepta los permisos:\n');
  console.log(authUrl, '\n');
  if (process.platform === 'win32') spawn('cmd', ['/c', 'start', '', authUrl.replace(/&/g, '^&')], { stdio: 'ignore', detached: true });
  const code = await new Promise((resolve, reject) => {
    server.on('request', (request, response) => {
      const url = new URL(request.url, redirectUri);
      if (!url.searchParams.has('code') && !url.searchParams.has('error')) { response.writeHead(404).end(); return; }
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end('<h2>Listo. Puedes cerrar esta pestaña y volver a la terminal.</h2>');
      server.close();
      if (url.searchParams.get('state') !== state) reject(new Error('Respuesta de Google inválida (state).'));
      else if (url.searchParams.get('error')) reject(new Error(`Google rechazó la autorización: ${url.searchParams.get('error')}`));
      else resolve(url.searchParams.get('code'));
    });
  });
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: verifier }),
  });
  const tokens = await tokenResponse.json();
  if (!tokens.refresh_token) throw new Error(`Google no entregó un refresh token: ${tokens.error_description || tokens.error || 'revisa el cliente OAuth (tipo «App de escritorio»).'}`);
  const granted = (tokens.scope || '').split(' ');
  for (const scope of scopes.slice(2)) if (!granted.includes(scope)) throw new Error(`No se concedió ${scope}. Repite y marca todas las casillas.`);
  const account = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString()).email;
  const auth = { Authorization: `Bearer ${tokens.access_token}` };
  // drive.file only reaches files this app created: the folder must be created here, not by hand.
  let folder = env.DRIVE_VIDEO_FOLDER_ID;
  if (folder) {
    const existing = await fetch(`https://www.googleapis.com/drive/v3/files/${folder}?fields=id,trashed`, { headers: auth });
    if (!existing.ok || (await existing.json()).trashed) folder = '';
  }
  if (!folder) {
    const created = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'UNICODE · Videos de convocatoria (privado)', mimeType: 'application/vnd.google-apps.folder' }),
    });
    if (!created.ok) throw new Error(`No se pudo crear la carpeta en Drive (${created.status}). ¿Está habilitada la Drive API?`);
    folder = (await created.json()).id;
  }
  writeEnv({ GOOGLE_REFRESH_TOKEN: tokens.refresh_token, DRIVE_VIDEO_FOLDER_ID: folder, RECRUITMENT_EMAIL_PROVIDER: env.RECRUITMENT_EMAIL_PROVIDER || 'gmail' });
  ok(`Cuenta autorizada: ${account}`);
  ok(`Carpeta privada: https://drive.google.com/drive/folders/${folder}`);
  ok('GOOGLE_REFRESH_TOKEN, DRIVE_VIDEO_FOLDER_ID y RECRUITMENT_EMAIL_PROVIDER guardados en .env');
  console.log('\nComparte esa carpeta solo con los evaluadores de GTH (como Lector). No la hagas pública.');
}

async function googleToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: env.GOOGLE_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  });
  const data = await response.json();
  if (!data.access_token) throw new Error(data.error_description || data.error || `HTTP ${response.status}`);
  return data;
}

async function check() {
  // PowerShell drops npm's `--`, so the address is also accepted as a plain argument.
  const sendTo = process.argv.find((arg) => arg.startsWith('--send-test='))?.split('=')[1] || process.argv.slice(3).find((arg) => /^[^\s@-][^\s@]*@[^\s@]+\.[^\s@]+$/.test(arg));
  console.log('\nVariables');
  for (const name of ['PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_PASSWORD']) env[name] ? ok(name) : fail(`Falta ${name}`);
  (env.RECRUITMENT_RESUME_ENCRYPTION_KEY || '').length >= 32 ? ok('RECRUITMENT_RESUME_ENCRYPTION_KEY') : fail('Clave de cifrado ausente o corta', 'npm run recruitment -- secrets');
  (env.CRON_SECRET || '').length >= 32 ? ok('CRON_SECRET') : fail('CRON_SECRET ausente o corto', 'npm run recruitment -- secrets');
  let base;
  try { base = new URL(env.RECRUITMENT_BASE_URL); base.protocol === 'https:' && base.pathname === '/' ? ok(`RECRUITMENT_BASE_URL ${base}`) : fail('RECRUITMENT_BASE_URL debe ser https://dominio/ sin ruta'); }
  catch { fail('Falta RECRUITMENT_BASE_URL', 'npm run recruitment -- secrets'); }

  console.log('\nSupabase');
  let config;
  if (env.PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const key = env.SUPABASE_SERVICE_ROLE_KEY;
    const headers = { apikey: key, 'Content-Type': 'application/json', ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}) };
    const response = await fetch(`${env.PUBLIC_SUPABASE_URL}/rest/v1/rpc/recruitment_admin_config`, { method: 'POST', headers, body: '{}' });
    if (response.ok) { config = (await response.json()).config; ok(`Migración aplicada · convocatoria ${config.enabled ? 'HABILITADA' : 'cerrada'} · videos en ${config.storageProvider}`); }
    else fail(`La migración no responde (${response.status})`, 'Pega supabase/migrations/20261002_recruitment.sql en Supabase → SQL Editor → Run');
    const publicKey = env.PUBLIC_SUPABASE_ANON_KEY;
    if (publicKey) {
      const exposed = await fetch(`${env.PUBLIC_SUPABASE_URL}/rest/v1/recruitment_applications?select=id&limit=1`, { headers: { apikey: publicKey } });
      const rpc = await fetch(`${env.PUBLIC_SUPABASE_URL}/rest/v1/rpc/recruitment_admin_config`, { method: 'POST', headers: { apikey: publicKey, 'Content-Type': 'application/json' }, body: '{}' });
      !exposed.ok && !rpc.ok ? ok('La clave pública no puede leer postulaciones ni ejecutar funciones') : fail('¡La clave pública tiene acceso a datos de convocatoria!', 'Vuelve a ejecutar el bloque final de la migración (REVOKE)');
    } else warn('Sin PUBLIC_SUPABASE_ANON_KEY en .env: no se comprobó el bloqueo de la clave pública.');
  }

  console.log('\nGoogle (videos y correo)');
  const provider = config?.storageProvider || 'drive';
  const usesGoogle = provider === 'drive' || env.RECRUITMENT_EMAIL_PROVIDER === 'gmail';
  let token;
  if (usesGoogle) {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) fail('Faltan credenciales de Google', 'npm run recruitment -- google');
    else {
      try {
        token = await googleToken(); ok('El refresh token renueva el acceso');
        const scopes = token.scope.split(' ');
        if (provider === 'drive') scopes.includes('https://www.googleapis.com/auth/drive.file') ? ok('Permiso drive.file') : fail('Falta permiso de Drive', 'npm run recruitment -- google');
        if (env.RECRUITMENT_EMAIL_PROVIDER === 'gmail') scopes.includes('https://www.googleapis.com/auth/gmail.send') ? ok('Permiso gmail.send') : fail('Falta permiso de Gmail', 'npm run recruitment -- google');
      } catch (error) { fail(`Google rechazó el refresh token: ${error.message}`, 'Si el cliente OAuth está en modo «Prueba» caduca a los 7 días: publícalo y repite «google»'); }
    }
    if (token && provider === 'drive') {
      const folder = await fetch(`https://www.googleapis.com/drive/v3/files/${env.DRIVE_VIDEO_FOLDER_ID}?fields=id,name,trashed,mimeType`, { headers: { Authorization: `Bearer ${token.access_token}` } });
      const data = folder.ok ? await folder.json() : null;
      data && !data.trashed && data.mimeType === 'application/vnd.google-apps.folder' ? ok(`Carpeta «${data.name}» accesible para la app`) : fail('La app no puede usar DRIVE_VIDEO_FOLDER_ID', 'npm run recruitment -- google (crea la carpeta desde la app)');
    }
  }

  console.log('\nCorreo');
  if (env.RECRUITMENT_EMAIL_PROVIDER === 'gmail') ok('Proveedor: Gmail de la cuenta autorizada');
  else if (env.RESEND_API_KEY && env.RECRUITMENT_EMAIL_FROM) {
    const response = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` } });
    if (!response.ok) fail(`Resend rechazó la clave (${response.status})`);
    else {
      const domain = env.RECRUITMENT_EMAIL_FROM.match(/@([^>\s]+)/)?.[1];
      const verified = (await response.json()).data?.some((item) => item.name === domain && item.status === 'verified');
      verified ? ok(`Resend con dominio verificado ${domain}`) : fail(`El dominio ${domain} no está verificado en Resend`);
    }
  } else fail('Sin proveedor de correo', 'Usa Gmail: npm run recruitment -- google');
  if (sendTo) {
    if (env.RECRUITMENT_EMAIL_PROVIDER === 'gmail' && token) {
      const mime = [`To: ${sendTo}`, `Subject: =?UTF-8?B?${Buffer.from('Prueba de correo de la convocatoria UNICODE').toString('base64')}?=`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', '', 'Si recibes este mensaje, los correos de la convocatoria funcionan.'].join('\r\n');
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: Buffer.from(mime).toString('base64url') }) });
      response.ok ? ok(`Correo de prueba enviado a ${sendTo}`) : fail(`Gmail rechazó el envío (${response.status})`);
    } else fail('No se pudo enviar el correo de prueba: este script solo prueba Gmail.');
  }

  console.log('\nDespliegue');
  if (base) {
    try {
      const response = await fetch(new URL('/api/recruitment/config', base), { signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      data.deploymentReady ? ok(`${base} tiene todas las integraciones configuradas`) : fail(`${base} aún no tiene las variables (deploymentReady=false)`, 'npm run recruitment -- vercel y vuelve a desplegar');
    } catch { fail(`${base} no responde con esta versión`, 'Fusiona y despliega el PR'); }
  }
  console.log(failures ? `\n${failures} pendiente(s).` : '\nTodo listo. Abre /admin/recruitment para configurar fechas y habilitar.');
  process.exitCode = failures ? 1 : 0;
}

async function vercel() {
  const names = SERVER_VARIABLES.filter((name) => env[name]);
  console.log('Se usará la CLI de Vercel (pide iniciar sesión y vincular el proyecto si hace falta).');
  if (spawnSync('npx', ['--yes', 'vercel', 'link'], { stdio: 'inherit', shell: true }).status !== 0) process.exit(1);
  for (const name of names) {
    // Update in place; never remove a working production value before its replacement exists.
    const update = spawnSync('npx', ['vercel', 'env', 'update', name, 'production', '--yes'], { input: env[name], stdio: ['pipe', 'ignore', 'pipe'], shell: true });
    const result = update.status === 0 ? update : spawnSync('npx', ['vercel', 'env', 'add', name, 'production'], { input: env[name], stdio: ['pipe', 'ignore', 'pipe'], shell: true });
    result.status === 0 ? ok(name) : fail(`${name}: ${result.stderr.toString().trim().split('\n').pop()}`);
  }
  if (failures) { console.log(`\n${failures} variable(s) sin actualizar; las demás quedaron intactas.`); process.exit(1); }
  console.log('\nRedespliega producción para que tome los valores (fusionar el PR también lo hace).');
}

async function github() {
  if (!env.CRON_SECRET || !env.RECRUITMENT_BASE_URL) { console.log('Primero: npm run recruitment -- secrets'); process.exit(1); }
  // The scheduled worker calls production every 5 minutes; enable it only once Vercel has CRON_SECRET.
  const secret = spawnSync('gh', ['secret', 'set', 'RECRUITMENT_CRON_SECRET'], { input: env.CRON_SECRET, stdio: ['pipe', 'inherit', 'inherit'] });
  const variable = spawnSync('gh', ['variable', 'set', 'RECRUITMENT_BASE_URL', '--body', env.RECRUITMENT_BASE_URL], { stdio: 'inherit' });
  secret.status === 0 && variable.status === 0 ? ok('Cola de correos programada cada 5 minutos en GitHub Actions') : fail('No se pudo configurar GitHub (¿gh auth login con permisos de administración del repo?)');
}

const commands = { secrets, google, check, vercel, github };
const command = commands[process.argv[2]];
if (!command) { console.log('Uso: npm run recruitment -- <secrets|google|check|vercel|github>'); process.exit(1); }
command().catch((error) => { console.error(`\n✖ ${error.message}`); process.exit(1); });
