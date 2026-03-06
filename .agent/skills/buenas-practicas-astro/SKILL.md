---
name: buenas-practicas-astro
description: Aplica estrictamente las mejores prácticas de desarrollo en Astro, optimizando el rendimiento (LCP < 2.5s), gestionando imágenes (WebP) y utilizando la arquitectura de islas eficientemente.
---

# Especialista en Rendimiento y Buenas Prácticas de Astro

## Contexto y Propósito
El agente asume el rol de un desarrollador front-end experto enfocado puramente en las mejores prácticas de Astro. Su objetivo central es garantizar que el código cumplo con el RNFs como tiempos de carga casi instantáneos (LCP < 2.5s) y un límite de peso por página (< 2.5MB).

## Cuándo Activar
- Cuando el usuario pida "optimizar la página", "mejorar el rendimiento" o aplicar "buenas prácticas de Astro".
- Al momento de crear un componente interactivo que requiera o no JavaScript (para decidir sobre las directivas de cliente).
- Al manejar imágenes, logotipos y recursos estáticos.
- Al implementar Server-Side Rendering (SSR) o variables en Static Site Generation (SSG).

## Reglas de Ejecución y Mejores Prácticas

### 1. Optimizador de Imágenes (astro:assets)
- NUNCA uses etiquetas `<img>` simples para contenido que no sea un SVG puro.
- SIEMPRE utiliza `<Image />` o `<Picture />` nativos del módulo `astro:assets`.
- Todas las imágenes grandes deben ser automáticamente convertidas a formato `webp` garantizando que ninguna imagen supere los **300 KB**.
- *Ejemplo de uso:* 
  ```astro
  ---
  import { Image } from 'astro:assets';
  import heroImage from '../assets/hero.png'; // Astro optimiza automáticamente a WebP
  ---
  <Image src={heroImage} alt="Hero Unicode" width={800} height={600} loading="eager" />
  ```
- Usa `loading="eager"` SÓLO para imágenes que estén *above-the-fold* (visibles inmediatamente al cargar), y deja que Astro asigne `lazy` al resto.

### 2. Arquitectura de Islas (JavaScript Mínimo)
- Astro no envía JavaScript al cliente de forma predeterminada. ¡Mantenlo así para el peso < 2.5MB!
- Si un componente necesita interactividad (ej. React, Vue o Svelte para el menú hamburguesa de móvil), usa la directiva de hidratación más restrictiva posible:
  - Usa `client:load` SOLO si la interactividad es crítica de inmediato.
  - Usa `client:idle` para interactividad de menor prioridad no inmediata.
  - Usa `client:visible` para componentes interactivos ubicados más abajo en la página (se hidratan al hacer scroll).
  - Componentes meramente informativos NINGUNA directiva.

### 3. Fetching de Datos Estáticos (SSG)
- Aprovecha al máximo la compilación. Si estás pidiendo datos a la base de datos (Supabase) que rara vez cambian (directores de áreas, descripción del centro), haz la petición en el bloque "fronmatter" (`---`) de la página. 
- Astro recuperará estos datos en durante el build. Nunca atesores el hilo del navegador haciendo peticiones innecesarias desde el cliente con Fetch API.

### 4. Estructura de Componentes
- Modulariza fuertemente tu proyecto. Crea pequeñas tarjetas o layouts base (por ejemplo `BaseLayout.astro`) para inyectar `<slot />` y reducir la repetición de HTML. No pongas todo el código de una página extensa en un solo archivo.
