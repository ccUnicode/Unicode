/** Development only: real local PostgreSQL engine using exactly the production migrations. */
import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { RpcResponse } from './recruitment/types';

let connection: Promise<PGlite> | undefined;
async function openDatabase(): Promise<PGlite> {
  if (!import.meta.env.DEV) throw new Error('La base local no está permitida en producción.');
  const directory = import.meta.env.RECRUITMENT_LOCAL_DB_PATH || process.env.RECRUITMENT_LOCAL_DB_PATH;
  if (!directory) throw new Error('Falta RECRUITMENT_LOCAL_DB_PATH.');
  await mkdir(resolve(directory), { recursive: true });
  const database = new PGlite(resolve(directory));
  await database.waitReady;
  await database.exec(`DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
  END $$; CREATE TABLE IF NOT EXISTS local_recruitment_migrations(name text primary key);`);
  const migrationDirectory = resolve('supabase/migrations');
  for (const filename of (await readdir(migrationDirectory)).filter((name) => name.endsWith('.sql')).sort()) {
    const exists = await database.query('SELECT name FROM local_recruitment_migrations WHERE name=$1', [filename]);
    if (exists.rows.length) continue;
    await database.exec(await readFile(resolve(migrationDirectory, filename), 'utf8'));
    await database.query('INSERT INTO local_recruitment_migrations VALUES($1)', [filename]);
  }
  return database;
}

export async function localRpc<T>(name: string, args: Record<string, unknown> = {}): Promise<RpcResponse<T>> {
  try {
    if (!/^recruitment_[a-z_]+$/.test(name)) throw new Error('Función local no permitida.');
    const entries = Object.entries(args);
    if (entries.some(([key]) => !/^p_[a-z_]+$/.test(key))) throw new Error('Parámetros no permitidos.');
    connection ||= openDatabase();
    const database = await connection;
    const parameters = entries.map(([key], index) => `${key} => $${index + 1}`).join(',');
    const values = entries.map(([, value]) => value !== null && typeof value === 'object' ? JSON.stringify(value) : value);
    const result = await database.query<{ data: T }>(`SELECT public.${name}(${parameters}) AS data`, values);
    return { data: result.rows[0]?.data ?? null, error: null };
  } catch (error) {
    return { data: null, error: { message: error instanceof Error ? error.message : 'Error de base de datos local.' } };
  }
}
