/**
 * Browser-side persistence for the applicant flow. Everything here survives closing
 * the browser; the server remains the source of truth and every value is revalidated.
 */
import type { ApplicationData } from "../lib/recruitment/types";

export const SESSION_KEY = "unicode-recruitment-session";
const FORM_KEY = "unicode-recruitment-form";
const DATABASE = "unicode-recruitment";
const STORE = "answers";

export type StoredSession = { id: string; token: string };
export type StoredForm = { id: string | null; data: Partial<ApplicationData>; phase: "data" | "video"; pending: boolean; savedAt: number };
/** A recorded or selected answer that has not been verified by the server yet. */
export type StoredAnswer = {
  applicationId: string; blob: Blob; mode: "recording" | "upload"; duration: number;
  failureCount: number; savedAt: number;
};

function readJson<T>(storage: Storage, key: string): T | null {
  try { return JSON.parse(storage.getItem(key) || "null") as T | null; } catch { return null; }
}

/** localStorage survives closing the browser; sessionStorage is kept as a fallback and for older links. */
export function loadSession(): StoredSession | null {
  for (const storage of [() => localStorage, () => sessionStorage]) {
    try {
      const value = readJson<StoredSession>(storage(), SESSION_KEY);
      if (value?.id && value.token) return value;
    } catch { /* Storage blocked by the browser. */ }
  }
  return null;
}

export function saveSession(session: StoredSession): void {
  const value = JSON.stringify(session);
  try { localStorage.setItem(SESSION_KEY, value); } catch { try { sessionStorage.setItem(SESSION_KEY, value); } catch { /* The personal link still works. */ } }
}

export function loadForm(): StoredForm | null {
  try { return readJson<StoredForm>(localStorage, FORM_KEY); } catch { return null; }
}

export function saveForm(form: Omit<StoredForm, "savedAt">): void {
  try { localStorage.setItem(FORM_KEY, JSON.stringify({ ...form, savedAt: Date.now() })); } catch { /* Quota or storage disabled. */ }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB unavailable")); return; }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "applicationId" }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB blocked"));
  });
}

async function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDatabase();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request ? request.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}

/** Returns false when the browser refuses to store the video (private mode, quota). */
export async function saveAnswer(answer: StoredAnswer): Promise<boolean> {
  try { await transaction("readwrite", store => { store.put(answer); }); return true; } catch { return false; }
}

export async function loadAnswer(applicationId: string): Promise<StoredAnswer | null> {
  try { return (await transaction<StoredAnswer>("readonly", store => store.get(applicationId))) ?? null; } catch { return null; }
}

export async function forgetAnswer(applicationId?: string): Promise<void> {
  try { await transaction("readwrite", store => { if (applicationId) store.delete(applicationId); else store.clear(); }); } catch { /* Nothing stored. */ }
}

/** Removes every trace of the application from this browser (shared computers, after submitting). */
export async function forgetEverything(): Promise<void> {
  for (const storage of [() => localStorage, () => sessionStorage]) {
    try { storage().removeItem(SESSION_KEY); storage().removeItem(FORM_KEY); } catch { /* Storage blocked. */ }
  }
  await forgetAnswer();
}
