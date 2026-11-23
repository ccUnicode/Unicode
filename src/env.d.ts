/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /**
     * Usuario autenticado en el CMS con su rol y alcance de área.
     * Inyectado automáticamente por el middleware de Astro (`src/middleware.ts`).
     */
    user?: import('./types/cms').CmsSessionUser | null;
  }
}
