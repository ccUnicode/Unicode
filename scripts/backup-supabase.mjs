/**
 * Read-only backup of every table exposed by the Supabase project (including the
 * historical public.applicants) before the database is cleaned for a new call.
 *
 *   node --env-file=.env scripts/backup-supabase.mjs
 *
 * Needs PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. When SUPABASE_DB_URL is set
 * (Supabase → Project Settings → Database → connection string) and pg_dump is installed,
 * it also writes a complete pg_dump (schema + data + functions) for a faithful restore.
 * Nothing is modified or deleted. Output goes to backups/<timestamp>/ (git-ignored).
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const url = process.env.PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltan PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (usa --env-file=.env).');
  process.exit(1);
}
const headers = { apikey: key, Authorization: `Bearer ${key}` };
const directory = join('backups', new Date().toISOString().replace(/[:.]/g, '-'));
await mkdir(directory, { recursive: true });

const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const csvCell = (value) => {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
function toCsv(rows) {
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  // BOM so Excel opens accents correctly.
  return '﻿' + [columns.join(','), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(','))].join('\r\n');
}

// PostgREST publishes every table in its OpenAPI description.
const spec = await fetch(`${url}/rest/v1/`, { headers }).then((response) => {
  if (!response.ok) throw new Error(`No se pudo listar las tablas (${response.status}). Revisa la URL y la clave de servicio.`);
  return response.json();
});
const tables = Object.keys(spec.definitions || {}).sort();
console.log(`Tablas encontradas: ${tables.join(', ') || '(ninguna)'}`);

const manifest = { createdAt: new Date().toISOString(), project: new URL(url).hostname, tables: {}, pgDump: null };
for (const table of tables) {
  const rows = []; const page = 1000; let total = null;
  for (let offset = 0; total === null || offset < total; offset += page) {
    const response = await fetch(`${url}/rest/v1/${encodeURIComponent(table)}?select=*`, {
      headers: { ...headers, Prefer: 'count=exact', 'Range-Unit': 'items', Range: `${offset}-${offset + page - 1}` },
    });
    if (!response.ok) throw new Error(`Error al leer ${table} (${response.status}): ${await response.text()}`);
    total = Number(response.headers.get('content-range')?.split('/')[1] ?? 0);
    const batch = await response.json();
    rows.push(...batch);
    if (!batch.length) break;
  }
  if (rows.length !== total) throw new Error(`${table}: se esperaban ${total} filas y se leyeron ${rows.length}. Repite el respaldo.`);
  const json = JSON.stringify(rows, null, 2);
  await writeFile(join(directory, `${table}.json`), json);
  if (rows.length) await writeFile(join(directory, `${table}.csv`), toCsv(rows));
  manifest.tables[table] = { rows: rows.length, sha256: sha256(json) };
  console.log(`  ✔ ${table}: ${rows.length} filas`);
}

if (process.env.SUPABASE_DB_URL) {
  const file = join(directory, 'full.dump');
  const result = spawnSync('pg_dump', ['--format=custom', '--no-owner', '--no-privileges', '--schema=public', `--file=${file}`, process.env.SUPABASE_DB_URL], { stdio: 'inherit' });
  manifest.pgDump = result.status === 0 ? { file: 'full.dump', restore: 'pg_restore --no-owner --dbname=<URL> full.dump' } : { error: 'pg_dump falló; los JSON/CSV siguen siendo válidos.' };
  console.log(result.status === 0 ? '  ✔ pg_dump completo' : '  ✖ pg_dump falló (los JSON/CSV siguen siendo válidos)');
}

await writeFile(join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`\nRespaldo listo en ${directory}. Contiene datos personales: guárdalo en un lugar privado y no lo subas al repositorio.`);
