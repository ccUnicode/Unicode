/**
 * Servicio Multimedia de Supabase Storage para el CMS de UNICODE.
 * Proporciona validación estricta de formato (.webp y .png mediante Magic Bytes),
 * control de tamaños por bucket, subida protegida y obtención de URLs públicas.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase, supabaseAdmin } from '../supabase.ts';

export type CmsBucket = 
  | 'events-media' 
  | 'projects-media' 
  | 'alliances-logos' 
  | 'institutional-media';

export type AllowedMimeType = 'image/webp' | 'image/png';

export interface BucketMetadata {
  readonly id: CmsBucket;
  readonly maxBytes: number;
  readonly label: string;
  readonly allowedMimeTypes: readonly AllowedMimeType[];
}

export const CMS_BUCKET_CONFIGS: Record<CmsBucket, BucketMetadata> = {
  'events-media': {
    id: 'events-media',
    maxBytes: 5 * 1024 * 1024, // 5 MB
    label: '5 MB',
    allowedMimeTypes: ['image/webp', 'image/png'],
  },
  'projects-media': {
    id: 'projects-media',
    maxBytes: 5 * 1024 * 1024, // 5 MB
    label: '5 MB',
    allowedMimeTypes: ['image/webp', 'image/png'],
  },
  'alliances-logos': {
    id: 'alliances-logos',
    maxBytes: 2 * 1024 * 1024, // 2 MB
    label: '2 MB',
    allowedMimeTypes: ['image/webp', 'image/png'],
  },
  'institutional-media': {
    id: 'institutional-media',
    maxBytes: 5 * 1024 * 1024, // 5 MB
    label: '5 MB',
    allowedMimeTypes: ['image/webp', 'image/png'],
  },
} as const;

export interface UploadMediaOptions {
  bucket: CmsBucket;
  file: Blob | Buffer | Uint8Array;
  fileName?: string;
  area?: string;
  contentType?: string;
  upsert?: boolean;
  client?: SupabaseClient;
}

export interface UploadMediaResult {
  path: string;
  publicUrl: string;
  bucket: CmsBucket;
  size: number;
  mimeType: AllowedMimeType;
}

export interface MediaValidationResult {
  mimeType: AllowedMimeType;
  ext: 'webp' | 'png';
  size: number;
}

/**
 * Valida los números mágicos (magic bytes) en el encabezado binario
 * para asegurar que el archivo sea auténticamente .webp o .png
 * y prevenir extension spoofing.
 */
export function inspectImageMagicBytes(bytes: Uint8Array): { mimeType: AllowedMimeType; ext: 'webp' | 'png' } {
  if (!bytes || bytes.length < 12) {
    throw new Error('El archivo es demasiado pequeño o está corrupto para ser una imagen válida.');
  }

  // PNG Magic Bytes: 89 50 4E 47 0D 0A 1A 0A
  const isPng = (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );

  if (isPng) {
    return { mimeType: 'image/png', ext: 'png' };
  }

  // WebP Magic Bytes: RIFF....WEBP (0..3: RIFF, 8..11: WEBP)
  const isWebp = (
    bytes[0] === 0x52 && // 'R'
    bytes[1] === 0x49 && // 'I'
    bytes[2] === 0x46 && // 'F'
    bytes[3] === 0x46 && // 'F'
    bytes[8] === 0x57 && // 'W'
    bytes[9] === 0x45 && // 'E'
    bytes[10] === 0x42 && // 'B'
    bytes[11] === 0x50    // 'P'
  );

  if (isWebp) {
    return { mimeType: 'image/webp', ext: 'webp' };
  }

  throw new Error('Formato de imagen no permitido. Exclusivamente se aceptan archivos WebP (.webp) o PNG (.png).');
}

/**
 * Convierte cualquier entrada binaria compatible en un Uint8Array normalizado.
 */
export async function normalizeBinaryData(data: Blob | Buffer | Uint8Array): Promise<Uint8Array> {
  if (data instanceof Uint8Array) {
    return data;
  }
  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer());
  }
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  throw new Error('Tipo de datos de archivo no soportado para procesamiento binario.');
}

/**
 * Valida tamaño y formato de un recurso multimedia respecto a las reglas del bucket.
 */
export function validateMediaFile(
  bytes: Uint8Array,
  bucket: CmsBucket,
  declaredMime?: string
): MediaValidationResult {
  const config = CMS_BUCKET_CONFIGS[bucket];
  if (!config) {
    throw new Error(`El bucket '${bucket}' no está registrado en la configuración del CMS.`);
  }

  if (bytes.byteLength > config.maxBytes) {
    throw new Error(
      `El archivo (${(bytes.byteLength / (1024 * 1024)).toFixed(2)} MB) excede el límite máximo de ${config.label} permitido para el bucket '${bucket}'.`
    );
  }

  const inspected = inspectImageMagicBytes(bytes);

  if (declaredMime && declaredMime.toLowerCase() !== inspected.mimeType) {
    throw new Error(
      `El tipo MIME declarado (${declaredMime}) no coincide con el formato binario detectado (${inspected.mimeType}).`
    );
  }

  return {
    mimeType: inspected.mimeType,
    ext: inspected.ext,
    size: bytes.byteLength,
  };
}

/**
 * Genera una ruta canónica normalizada y segura para el almacenamiento.
 */
export function generateMediaStoragePath(options: {
  area?: string;
  fileName?: string;
  ext: 'webp' | 'png';
}): string {
  const areaPrefix = options.area ? `${options.area.toUpperCase().replace(/[^A-Z0-9_-]/g, '')}/` : '';
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9);

  if (options.fileName) {
    const sanitizedBase = options.fileName
      .replace(/\.[^/.]+$/, '') // remover extensión existente
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    return `${areaPrefix}${sanitizedBase}-${timestamp}-${randomSuffix}.${options.ext}`;
  }

  return `${areaPrefix}media-${timestamp}-${randomSuffix}.${options.ext}`;
}

/**
 * Obtiene el cliente Supabase adecuado (por defecto admin en backend o anon en cliente).
 */
function resolveStorageClient(customClient?: SupabaseClient): SupabaseClient {
  if (customClient) {
    return customClient;
  }
  const client = supabaseAdmin || supabase;
  if (!client) {
    throw new Error('Supabase Storage no está configurado (variables de entorno no disponibles).');
  }
  return client;
}

/**
 * Sube una imagen validada a Supabase Storage y retorna su ruta y URL pública.
 */
export async function uploadMedia(options: UploadMediaOptions): Promise<UploadMediaResult> {
  const bytes = await normalizeBinaryData(options.file);
  const validation = validateMediaFile(bytes, options.bucket, options.contentType);

  const storagePath = generateMediaStoragePath({
    area: options.area,
    fileName: options.fileName,
    ext: validation.ext,
  });

  const client = resolveStorageClient(options.client);
  const { data, error } = await client.storage
    .from(options.bucket)
    .upload(storagePath, bytes, {
      contentType: validation.mimeType,
      upsert: options.upsert ?? false,
    });

  if (error || !data) {
    throw new Error(`Error al subir imagen a Supabase Storage (${options.bucket}): ${error?.message || 'Fallo desconocido'}`);
  }

  const publicUrl = getMediaPublicUrl(options.bucket, storagePath, client);

  return {
    path: storagePath,
    publicUrl,
    bucket: options.bucket,
    size: validation.size,
    mimeType: validation.mimeType,
  };
}

/**
 * Obtiene la URL pública CDN de un archivo almacenado en un bucket del CMS.
 */
export function getMediaPublicUrl(
  bucket: CmsBucket,
  path: string,
  client?: SupabaseClient
): string {
  const storageClient = resolveStorageClient(client);
  const { data } = storageClient.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Elimina uno o más archivos multimedia de un bucket de Supabase Storage.
 */
export async function deleteMedia(
  bucket: CmsBucket,
  paths: string[],
  client?: SupabaseClient
): Promise<void> {
  if (!paths || paths.length === 0) return;
  const storageClient = resolveStorageClient(client);

  const { error } = await storageClient.storage.from(bucket).remove(paths);
  if (error) {
    throw new Error(`Error al eliminar archivos de Supabase Storage (${bucket}): ${error.message}`);
  }
}
