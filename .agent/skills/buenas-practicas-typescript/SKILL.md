---
name: buenas-practicas-typescript
description: Aplica un control riguroso de tipos usando TypeScript en el proyecto Astro/Supabase para prevenir errores, documentar componentes y definir contratos estrictos.
---

# Arquitecto de Tipado Estricto (TypeScript)

## Contexto y Propósito
El agente asume el rol de un guardián de la calidad del código mediante la aplicación de TypeScript estricto. Su misión es asegurar que ningún componente reciba datos inesperados y que toda conexión entre Astro, componentes y Supabase esté garantizada por tipos e interfaces.

## Cuándo Activar
- Cuando el usuario ponga en acción peticiones a variables, utilidades API o interfaces.
- Cuando se empiecen a extraer y reutilizar componentes que exijan Props paramétrizadas (Ej. Una `ProjectCard` que reciba data de proyecto).
- Siempre que veas un `any` asolando en el código del usuario.

## Reglas de Ejecución y Mejores Prácticas (Clean Code)

### 1. Eliminación del uso de `any`
- Queda totalmente prohíbido usar `any`. Cada dato de este proyecto debe tener una `interface` o un `type` representativo.
- Si vienen datos de Supabase poco conocidos, usa `unknown` antes que `any` y valida mediante guardas de tipos.

### 2. Contratos de Componentes Astro (Props)
- Si vas a crear un componente generativo, define exactamente qué tipos de parámetros (`Props`) debe recibir en el bloque de TypeScript superior de Astro.
- *Ejemplo estricto:*
  ```astro
  ---
  interface Props {
    title: string;
    description: string;
    isActive: boolean;
    tags?: string[]; // Arrays y opcionales bien definidos
  }
  const { title, description, isActive = false, tags = [] } = Astro.props as Props;
  ---
  ```
- Provee valores por defecto cuando importes `Astro.props` en caso de los parámetros opcionales genéricos.

### 3. Tipos Reutilizables y Centralización
- No vuelvas a escribir `interface Project` dentro de cada componente que lo use. 
- Todas las interfaces generales de Entidades (Proyecto, Miembro, Área, Evento) DEBEN alojarse en un archivo global central, por ejemplo `src/types/index.ts`.
- Los tipados de la base de datos deben ser generados e importados desde el schema maestro de Supabase (Database) que convive en `src/lib/database.types.ts`. Extender en lugar de duplicar:
  ```typescript
  import type { Database } from '../lib/database.types';
  export type Project = Database['public']['Tables']['proyectos']['Row'];
  ```

### 4. Manejo Estricto de Errores (Error Handling)
- No devuelvas las peticiones felices sin revisar excepciones, ni escribas `console.log(error)`. 
- Todo acceso a asíncronía (`supabase.from()` y `fetch`) DEBE envolverse en manejo de respuesta seguro. Las respuestas deben separar tipificadamente el éxito del error del SDK.
- Usa en vez el patrón `const { data, error } = await supabase...` verificando exhaustivamente que `error` sea nulo y `data` contenga información antes de intentar renderizar en pantalla.
