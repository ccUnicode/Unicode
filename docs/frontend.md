# Documentación del Frontend

Este documento describe la arquitectura, las guías de desarrollo, los contratos de datos y las especificaciones de diseño aplicados en el frontend de la plataforma oficial de UNICODE.

---

## 1. Explicación (Contexto y Arquitectura)

Esta sección provee el contexto técnico, las herramientas utilizadas y los fundamentos arquitectónicos que justifican el diseño actual del cliente.

### 1.1. Arquitectura de Islas
El frontend está construido sobre el framework Astro. Por defecto, Astro compila el código del lado del servidor y envía HTML estático libre de JavaScript al navegador. La interactividad del lado del cliente se logra mediante la hidratación selectiva de componentes dinámicos únicamente cuando es estrictamente necesario (por ejemplo, el panel de administración o el modal de postulación), manteniendo un peso de página mínimo y un rendimiento de carga óptimo.

### 1.2. Ecosistema Tecnológico y Distribución de Trabajo

#### 1.2.1. Componentes del Stack Tecnológico
Cada tecnología del entorno del cliente ha sido seleccionada para cumplir con los requisitos de rendimiento, tipado estricto y modularidad exigidos por la Directiva ID:

* **Astro Framework (v4.x):** Actúa como el orquestador principal de la interfaz de usuario. Utiliza la arquitectura de islas para compilar estáticamente las vistas principales en el servidor, inyectando código JavaScript hidratado únicamente en las secciones interactivas que lo requieran para agilizar el tiempo de carga (LCP).
* **TypeScript:** Implementa un entorno de tipado estricto en el lado del cliente. Asegura que los contratos de datos de la capa API local y las propiedades transferidas a los componentes coincidan estrictamente con las interfaces de control, previniendo excepciones en tiempo de ejecución.
* **Tailwind CSS:** Framework utilitario que agiliza la maquetación bajo el enfoque orientado a móviles corporativo. Centraliza la paleta de colores del tema oscuro dominante y restringe las interacciones y llamados a la acción (CTAs) al color de acento verde neón institucional (`#75D32D`).
* **Nanostores (`lib/db-store.ts`):** Gestor de estado ligero y agnóstico que administra la reactividad global y los estados síncronos de navegación en el navegador sin la penalización de peso de frameworks masivos de terceros.

#### 1.2.2. Distribución de Módulos y Responsabilidades por Ramas
Para evitar colisiones en el control de versiones y garantizar la autonomía del desarrollo, el sistema se divide de manera modular en cuatro flujos asignados por áreas de trabajo:

* **Módulo de Convocatorias y Página de Inicio (Desarrollador: Jeanpier):** a
* **Módulo de Áreas de Conocimiento (Desarrollador: Leonel):** Responsable de la arquitectura y subrutas físicas individuales de las disciplinas organizacionales en `src/pages/areas/`. Coordina la inyección de la tienda de estados `lib/db-store.ts` para mantener la reactividad de las pestañas activas, gestiona los componentes de esqueleto de carga visual (*Skeleton Loaders*) y centraliza los mocks de datos estáticos en `src/data/projects.ts`.
* **Módulo de Catálogo de Proyectos (Desarrollador: José):** a
* **Módulo de Agenda y Calendario de Eventos (Desarrollador: Luis):** a

### 1.3. Flujo de Datos y Capa de API Intermedia
Para interactuar de forma segura con la base de datos de Supabase, la aplicación implementa una capa intermedia de endpoints locales en el directorio `src/pages/api/`. En lugar de inicializar clientes de administración con privilegios elevados en el navegador, el cliente del frontend realiza consultas HTTPS directas a estos endpoints locales. Este enfoque previene la exposición de claves privadas del servidor (como `SUPABASE_SERVICE_ROLE_KEY`) y permite centralizar la validación de tokens de sesión y el control de tasas de solicitudes en el servidor.

### 1.4. Enfoque de Diseño Visual (UI/UX)
La interfaz del proyecto adopta el concepto de diseño orientado a móviles, lo que asegura que todos los flujos de usuario y diseños se estructuren primero para pantallas de dispositivos móviles antes de escalarse a resoluciones de tableta y escritorio. La estética visual se basa en un tema oscuro dominante para reducir la fatiga visual, utilizando contrastes de gris oscuro y negro junto con el color de acento verde neón (`#75D32D`) para destacar elementos de acción primaria (CTAs), enlaces activos y estados de interacción.

---

## 2. Guías Prácticas (Instrucciones orientadas a tareas)

Estas guías proporcionan procedimientos específicos para resolver tareas de desarrollo recurrentes en el cliente sin duplicar lógica de código en la documentación.

### 2.1. Cómo consumir APIs internas y controlar los estados de la UI
Para consultar datos de los endpoints del backend e integrar los diferentes estados de la interfaz de usuario en el cliente, siga el flujo conceptual estructurado a continuación:

1.  **Fase de Carga**: Al iniciar la acción asíncrona, oculte el contenedor principal de la lista de datos y los contenedores de mensaje de error o estado vacío. Active e inserte visualmente en el DOM el componente indicador de carga (como un spinner de carga o un esqueleto de carga de ancho adaptativo).
2.  **Fase de Consumo Asíncrono**: Realice una llamada HTTPS asíncrona (utilizando `fetch` con `async/await`) al endpoint local correspondiente dentro de `src/pages/api/`. Si el endpoint requiere privilegios de administrador, extraiga el token de sesión guardado en el almacenamiento local e inyéctelo en la cabecera `Authorization` bajo el esquema de portador (`Bearer`).
3.  **Fase de Evaluación / Estado Vacío**: Una vez obtenida la respuesta exitosa del servidor, verifique la longitud del arreglo de datos recibido. Si el total de elementos es igual a cero, oculte el componente indicador de carga y active la visibilidad del contenedor de estado vacío para informar al usuario de la ausencia de registros.
4.  **Fase de Error con Captura**: Envuelva todo el procedimiento en un bloque de control `try/catch`. Si la petición falla por problemas de red, si el servidor responde con códigos de error (4xx/5xx) o si el token de sesión es inválido, capture la excepción en el bloque `catch`, oculte el indicador de carga, muestre un mensaje descriptivo en el contenedor de error y proporcione un botón de reintento que invoque nuevamente la función de carga.

### 2.2. Cómo controlar la apertura y cierre de diálogos modales
Para implementar y controlar ventanas emergentes en el navegador sin interferir con la navegación del usuario de fondo, utilice el elemento de diálogo nativo:

1.  **Estructura del Componente**: Declare la ventana de diálogo utilizando la etiqueta nativa `<dialog>` en el archivo del componente.
2.  **Apertura del Diálogo**: En el script del cliente, capture el evento de clic de los botones de activación e invoque el método nativo `.showModal()` del elemento de diálogo. Esto asegura la gestión automática del foco de teclado y el renderizado correcto del fondo traslúcido.
3.  **Cierre del Diálogo**: Capture el evento de clic en el botón de cierre del formulario e invoque el método nativo `.close()` del elemento de diálogo.
4.  **Bloqueo de Desplazamiento**: Para evitar que el usuario pueda desplazarse por el contenido de la página principal mientras el modal está abierto, asigne el valor `"hidden"` a la propiedad `document.body.style.overflow` durante la apertura, y restablézcalo a `"auto"` al ejecutar el cierre.

---

## 3. Referencia (Especificaciones técnicas y contratos)

Esta sección contiene datos concretos, contratos de interfaces y especificaciones técnicas para consulta rápida.

### 3.1. Árbol de Carpetas del Frontend (`src/`)
A continuación se detalla la ubicación física de los archivos del frontend:

```text
src/
├── assets/                             # Recursos estáticos globales (Gráficos y SVG)
│   ├── astro.svg                       # Logotipo por defecto de Astro
│   ├── background.svg                  # Gráfico SVG de fondo para el lienzo
│   └── alliance-logos/                  # Logotipos de comunidades aliadas
├── components/                         # Componentes globales y modulares de la interfaz
│   ├── footer.astro                    # Pie de página institucional
│   ├── hero.astro                      # Sección de encabezado de la Landing principal
│   ├── navbar.astro                    # Barra de navegación colapsable y responsiva
│   ├── welcome.astro                   # Panel de bienvenida inicial
│   ├── components-areas/               # Módulos del flujo de áreas de conocimiento
│   │   ├── area-card.astro              # Tarjeta individual del catálogo maestro
│   │   ├── area-director-profile.astro   # Perfil y foto del director del área
│   │   ├── area-project-card.astro       # Tarjeta de proyectos pertenecientes al área
│   │   ├── area-project-slider.astro     # Deslizador horizontal de proyectos del área
│   │   ├── area-requirement.astro       # Lista de requisitos del área
│   │   ├── area-valor.astro             # Valores y competencias del área
│   │   ├── area-win-card.astro           # Logros y metas de la disciplina
│   │   ├── hero-area-individual.astro    # Encabezado visual para las páginas individuales
│   │   └── hero-areas.astro             # Encabezado para el catálogo de disciplinas
│   ├── components-call/                # Componentes para el flujo de convocatorias
│   │   ├── hero-call.astro              # Banner principal de la sección de convocatoria
│   │   ├── por-que-unicode.astro         # Propuesta de valor institucional
│   │   └── registro-modal.astro         # Modal con el formulario de postulación
│   ├── components-events/              # Componentes para el calendario y agenda
│   │   ├── eventos-realizados.astro     # Galería de actividades completadas
│   │   ├── faq-eventos.astro            # Preguntas frecuentes con acordeón
│   │   ├── hero-eventos.astro           # Encabezado del cronograma
│   │   └── proximos-eventos.astro       # Actividades agendadas activas
│   ├── components-home/                # Elementos exclusivos de la Landing principal
│   │   ├── about.astro                 # Propósito general de UNICODE
│   │   ├── alianzas.astro              # Rejilla adaptativa de logos aliados
│   │   ├── cta.astro                   # Llamada a la acción flotante
│   │   ├── explora-unicode.astro        # Bloque interactivo de inducción
│   │   ├── nosotros.astro              # Misión, visión y objetivos
│   │   ├── novedad-card.astro           # Tarjeta individual de noticia
│   │   ├── novedades.astro             # Contenedor de noticias
│   │   ├── presidentes.astro           # Muro de honor o sección informativa de la directiva
│   │   └── stats.astro                 # Estadísticas de impacto
│   └── components-projects/            # Componentes del catálogo de proyectos
│       ├── featured-project-card.astro   # Tarjeta destacada de ancho completo
│       ├── featured-section.astro       # Contenedor de la sección destacada
│       ├── project-card.astro           # Tarjeta para el catálogo general
│       ├── project-filters.astro        # Filtros por áreas y campo de búsqueda
│       ├── project-grid.astro           # Rejilla adaptativa y responsiva
│       ├── project-hero.astro           # Encabezado de la vitrina técnica
│       ├── project-modal.astro          # Ficha técnica detallada del proyecto
│       └── project-slider.astro         # Carrusel de proyectos open source
├── data/                               # Datos locales estáticos
│   ├── events.ts                       # Colección tipada de actividades y agenda
│   ├── projects.ts                     # Datos estáticos de los proyectos
│   └── siteConfig.ts                   # Configuración del sitio y estado de convocatoria
├── layouts/                            # Estructuras base compartidas
│   └── layout.astro                    # Plantilla común (inyecta Navbar y Footer)
├── lib/                                # Librerías e infraestructura
│   ├── dbStore.ts                      # Base de datos en memoria para pruebas locales
│   ├── sessionStore.ts                 # Validaciones criptográficas de sesiones admin
│   └── supabase.ts                     # Inicialización del cliente Supabase
├── styles/                             # Directivas globales de diseño
│   └── global.css                      # Configuración CSS y Tailwind
├── types/                              # Declaración de tipos estáticos
│   └── index.d.ts                      # Interfaces de TypeScript del dominio
└── pages/                              # Enrutamiento de páginas físicas
    ├── 404.astro                       # Página de error de ruta no encontrada
    ├── admin.astro                     # Dashboard de la directiva
    ├── areas.astro                     # Catálogo de disciplinas
    ├── call.astro                      # Página de convocatorias
    ├── eventos.astro                   # Sección de agenda y eventos
    ├── index.astro                     # Landing page de inicio
    ├── projects.astro                  # Vitrina de soluciones tecnológicas
    ├── api/                            # Endpoints de API ejecutados en servidor (SSR)
    │   ├── admin-login.ts              # Validador de credenciales de acceso
    │   ├── admin-logout.ts             # Invalidación de sesión del administrador
    │   ├── admin-postulantes.ts        # Consulta y filtrado de postulantes
    │   └── postular.ts                 # Mutación para añadir postulaciones
    └── areas/                          # Subpáginas de cada disciplina
        ├── academica.astro
        ├── direccion-de-comunicacion-y-contenido.astro
        ├── gestion-del-talento-humano.astro
        ├── investigacion-y-desarrollo.astro
        └── relaciones-publicas.astro
```

### 3.2. Enrutamiento y Páginas Físicas
La aplicación utiliza enrutamiento basado en archivos físicos dentro del directorio `src/pages/`:

*   `/` -> Página de inicio (`index.astro`).
*   `/areas` -> Catálogo maestro de áreas (`areas.astro`).
*   `/areas/academica` -> Detalle del área Académica (`areas/academica.astro`).
*   `/areas/direccion-de-comunicacion-y-contenido` -> Detalle de DCC (`areas/direccion-de-comunicacion-y-contenido.astro`).
*   `/areas/gestion-del-talento-humano` -> Detalle de GTH (`areas/gestion-del-talento-humano.astro`).
*   `/areas/investigacion-y-desarrollo` -> Detalle de I+D (`areas/investigacion-y-desarrollo.astro`).
*   `/areas/relaciones-publicas` -> Detalle de RRPP (`areas/relaciones-publicas.astro`).
*   `/call` -> Formulario de inscripción y convocatoria activa (`call.astro`).
*   `/eventos` -> Agenda e historial de actividades del centro (`eventos.astro`).
*   `/projects` -> Repositorio visual y vitrina de proyectos (`projects.astro`).
*   `/admin` -> Panel de administración y dashboard de postulantes (`admin.astro`).

### 3.3. Contratos de la API (Endpoints en `src/pages/api/`)

#### 3.3.1. `POST /api/postular`
Registra un nuevo postulante en el sistema.
*   **Cabeceras Requeridas**: `Content-Type: application/json`
*   **Cuerpo de la Petición**:
    ```json
    {
      "nombres": "string (obligatorio)",
      "apellidos": "string (obligatorio)",
      "correo": "string (obligatorio, formato email)",
      "telefono": "string (obligatorio, 9 dígitos)",
      "universidad": "string (obligatorio)",
      "carrera": "string (obligatorio)",
      "ciclo_universidad": "string o número (obligatorio)",
      "opcion1": "string (obligatorio, GTH|ACD|RRPP|DCC|ID)",
      "opcion2": "string (opcional, GTH|ACD|RRPP|DCC|ID)",
      "motivo_postulacion": "string (obligatorio)"
    }
    ```
*   **Respuesta Exitosa (200 OK)**:
    ```json
    {
      "message": "¡Inscripción recibida correctamente! Te contactaremos pronto."
    }
    ```
*   **Respuesta de Error (400 Bad Request)**:
    ```json
    {
      "error": "Todos los campos obligatorios deben ser completados."
    }
    ```

#### 3.3.2. `POST /api/admin-login`
Autentica al administrador y emite un token criptográfico temporal firmado.
*   **Cuerpo de la Petición**:
    ```json
    {
      "password": "string (obligatorio)"
    }
    ```
*   **Respuesta Exitosa (200 OK)**:
    ```json
    {
      "token": "string (Token firmado HMAC-SHA256)"
    }
    ```
*   **Respuesta de Error (401 Unauthorized / Lockout)**:
    ```json
    {
      "error": "Contraseña incorrecta.",
      "attemptsRemaining": 2
    }
    ```

#### 3.3.3. `GET /api/admin-postulantes`
Obtiene la lista de los candidatos inscritos. Requiere autenticación.
*   **Cabeceras Requeridas**: `Authorization: Bearer <token>`
*   **Parámetros de Consulta (Query Params)**:
    *   `area` (GTH|ACD|RRPP|DCC|ID) - Filtra por disciplina de interés.
    *   `opcion` (todas|1ra|2da) - Filtra por prioridad de opción elegida.
    *   `orden` (reciente|1ra-2da) - Criterio de ordenamiento.
*   **Respuesta Exitosa (200 OK)**:
    ```json
    {
      "data": [
        {
          "id": "uuid",
          "nombres": "Juan",
          "apellidos": "Pérez",
          "correo": "juan@uni.edu.pe",
          "telefono": "999999999",
          "universidad": "UNI",
          "carrera": "Ingeniería de Sistemas",
          "ciclo_universidad": "5",
          "opcion1": "ID",
          "opcion2": "ACD",
          "motivo_postulacion": "Deseo aprender desarrollo de software...",
          "created_at": "ISO-8601-Timestamp"
        }
      ],
      "total": 1
    }
    ```

### 3.4. Tokens de Diseño y Accesibilidad
*   **Colores de la Paleta de Tailwind**:
    *   Fondo general: `#050505` (Neutral oscuro oscuro) / `#0a0a0a` (Neutral oscuro secundario).
    *   Líneas y bordes: `#27272a` (zinc-800) / `#3f3f46` (zinc-700).
    *   Acento primario y texto resaltado: `#75D32D` (Verde Neón UNICODE).
*   **Breakpoints Responsivos**:
    *   Móvil: `320px` a `480px` (Vista por defecto).
    *   Tableta: `481px` a `1024px` (Escalamiento en cuadrícula).
    *   Escritorio: `1025px` o superior (Menús laterales, vistas de ancho completo).
*   **Criterios de Accesibilidad**:
    *   Uso estricto de la etiqueta `<label>` con el atributo `for` enlazado al `id` del campo correspondiente en todos los formularios.
    *   Atributos `aria-label` descriptivos aplicados a todos los botones que contienen únicamente iconos (por ejemplo, flechas de paginación o botones de cierre).
    *   Contraste de color superior a 4.5:1 en textos de lectura general y títulos primarios.

### 3.5. Asignación de Módulos y Responsabilidades
El desarrollo de la plataforma se encuentra estructurado en base a la asignación de módulos individuales coordinados:

*   **Sección Home y Sección Convocatoria:** Responsable de la lógica de negocio, control de estados del formulario y validaciones seguras del cliente conectadas a Supabase (Encargado: Jeanpier).
*   **Sección Áreas:** Responsable de la estructura modular de las disciplinas de I+D (ID), Relaciones Públicas (RRPP), Gestión del Talento Humano (GTH), Académica (ACD) y Dirección de Creación y Contenido (DCC) (Encargado: Leonel).
*   **Sección Proyectos:** Responsable de la maquetación de tarjetas, vistas y filtros avanzados de los proyectos desarrollados por el centro (Encargado: José).
*   **Sección Eventos:** Responsable del diseño y visualización cronológica de actividades e historial de eventos de las áreas (Encargado: Luis).

### 3.6. Arquitectura y Especificación Técnica de las Secciones

#### 3.6.1. Home

*(Sección en blanco)*

#### 3.6.2. Áreas (Responsable: Leonel)
Esta sección detalla la arquitectura modular y los patrones implementados para la gestión de las disciplinas de UNICODE:

1.  **Componentes Modulares Asociados (`src/components/components-areas/`)**:
    *   `area-card.astro`: Renderiza la presentación resumida y acceso individual de la disciplina en la grilla general del catálogo.
    *   `hero-area-individual.astro`: Encabezado responsivo personalizado para cada disciplina, importando metadatos particulares.
    *   `area-director-profile.astro`: Estructura visual para renderizar la foto, biografía corta y rol del director del área correspondiente.
    *   `area-valor.astro` y `area-win-card.astro`: Bloques dinámicos diseñados para renderizar los pilares y logros específicos del área de conocimiento.
    *   `area-project-card.astro` y `area-project-slider.astro`: Carrusel responsivo que filtra y muestra exclusivamente los proyectos de desarrollo tecnológico del área seleccionada.
    *   `area-requirement.astro`: Bloque informativo que lista de forma declarativa los perfiles técnicos y requerimientos mínimos exigidos a los postulantes.
2.  **Sistema de Enrutamiento y Generación**:
    Las rutas de las disciplinas se gestionan a través de archivos estáticos individuales bajo el directorio `src/pages/areas/` (ej. `academica.astro`, `gestion-del-talento-humano.astro`), garantizando compatibilidad total con renderizado SSR y posicionamiento en buscadores (SEO) sin dependencias de enrutamiento dinámico en el navegador.
3.  **Integración de Estado Reactivo**:
    El control de la navegación interactiva y la retención de filtros por disciplina en la interfaz del cliente se delega a `src/lib/db-store.ts` basado en Nanostores. Esto mantiene el consumo de memoria en niveles mínimos y desacopla los componentes de dependencias de frameworks externos complejos.

#### 3.6.3. Proyectos (Responsable: José)
Esta sección detalla la arquitectura modular y los patrones implementados para la vitrina de soluciones tecnológicas de UNICODE:

1.  **Componentes Modulares Asociados (`src/components/components-projects/`)**:
    *   `project-hero.astro`: Encabezado visual de la sección con un título estilizado y una breve descripción introductoria.
    *   `featured-section.astro` y `featured-project-card.astro`: Bloques diseñados para destacar proyectos especiales de ancho completo, incluyendo detalles de la solución y botones interactivos.
    *   `project-filters.astro`: Panel interactivo que provee un campo de búsqueda de texto en tiempo real y un selector de filtros para segmentar por área organizativa.
    *   `project-grid.astro` y `project-card.astro`: Grilla responsiva y tarjeta individual para mostrar la vista previa de cada proyecto activo (imagen, etiquetas, título y descripción).
    *   `project-modal.astro`: Diálogo modal nativo que renderiza la ficha técnica detallada del proyecto seleccionado, incluyendo capturas de pantalla, tecnologías, repositorio, sitio web y miembros del equipo.
    *   `project-slider.astro`: Carrusel interactivo y responsivo para proyectos de código abierto (*open source*).
2.  **Sistema de Enrutamiento y Generación**:
    La vista principal se gestiona a través de la ruta física `/projects` mapeada al archivo `src/pages/projects.astro`, el cual aprovecha el renderizado en el servidor (SSR) para obtener los proyectos del archivo de datos estáticos y renderizar el contenido inicial.
3.  **Integración de Estado Reactivo e Interactividad**:
    La interactividad del catálogo (filtrado en tiempo real, búsqueda de texto, paginado y control del modal detallado) se ejecuta mediante scripts vanilla en el cliente. La paginación en pantallas de escritorio muestra hasta 6 elementos por página y se adapta dinámicamente, mientras que en pantallas móviles se muestra la lista completa de manera fluida.

#### 3.6.4. Eventos

*(Sección en blanco)*

---

## 4. Tutorial (Instrucciones de aprendizaje)

Este tutorial enseña a añadir un área de conocimiento adicional a la Landing Page paso a paso.

### Requisitos Previos
*   Contar con un entorno de desarrollo local activo corriendo con `npm run dev`.
*   Tener acceso al archivo del modal de registro y el panel de administración.

### Paso 1: Registrar el código del área en el Modal de Inscripción
Abra el archivo `src/components/components-call/registro-modal.astro`. Busque el selector de `opcion1` e inyecte una nueva etiqueta `<option>` con la abreviatura de tres letras en inglés del área que va a crear:

```html
<!-- Ejemplo para añadir un área ficticia 'TI' -->
<option value="TI">Tecnologías de la Información (TI)</option>
```

Repita la inserción de la opción en el selector correspondiente a `opcion2` dentro del mismo archivo para permitir su selección secundaria.

### Paso 2: Registrar la pestaña en el Panel de Administración
Abra el archivo `src/pages/admin.astro`. Inserte un botón para la pestaña del área dentro de la sección de filtros por área:

```html
<button
  class="area-tab px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200"
  data-area="TI"
>
  Área TI
</button>
```

Localice la constante `areaNames` en la etiqueta de script de `admin.astro` e inyecte la traducción para que el dashboard muestre el título formateado correctamente al seleccionarse la pestaña:

```typescript
const areaNames: Record<string, string> = {
  GTH: "Área de GTH",
  ACD: "Área Académica",
  ID: "Área de ID",
  RRPP: "Área RRPP",
  DCC: "Área DCC",
  TI: "Área de TI", // Nueva área agregada
};
```

### Paso 3: Crear la página de detalles del área en la estructura de rutas
Cree un archivo físico bajo el directorio `src/pages/areas/` siguiendo el formato kebab-case en minúsculas y sin acentos. Por ejemplo: `src/pages/areas/tecnologias-de-la-informacion.astro`.

Maquete el archivo heredando la plantilla maestra e importando los componentes correspondientes:

```astro
---
import Layout from "../../layouts/layout.astro";
import Navbar from "../../components/navbar.astro";
import HeroAreaIndividual from "../../components/components-areas/hero-area-individual.astro";
import AreaDirectorProfile from "../../components/components-areas/area-director-profile.astro";
---

<Layout title="Tecnologías de la Información - UNICODE">
  <Navbar />
  <main class="min-h-screen bg-[#050505] pt-24 text-white">
    <HeroAreaIndividual 
      title="Tecnologías de la Información"
      description="Dirección encargada del soporte tecnológico de nuestra organización."
    />
    
    <div class="max-w-7xl mx-auto px-6 py-12">
      <AreaDirectorProfile 
        name="John Doe"
        role="Director de TI"
        bio="Estudiante de Ingeniería de Software apasionado por la infraestructura."
      />
    </div>
  </main>
</Layout>
```

### Paso 4: Validar el despliegue local
Abra el navegador en `http://localhost:4321/areas/tecnologias-de-la-informacion` y compruebe que la página renderice el tema oscuro con el color de acento correcto. Compruebe la apertura del modal y la presencia del nuevo campo de selección.
