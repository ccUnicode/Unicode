# Arquitectura del Sistema

## 1. Propósito del sistema

El propósito principal de la Landing Page de Unicode es centralizar y potenciar la presencia digital de la organización, sirviendo como el canal oficial de comunicación para:
* **Visibilidad institucional:** Presentar la misión, visión y estructura interna de Unicode a la comunidad universitaria y profesional.
* **Difusión de áreas especializadas:** Explicar detalladamente las funciones y aportes de cada una de las divisiones de la organización: Investigación y Desarrollo (`ID`), Relaciones Públicas (`RRPP`), Gestión de Talento Humano (`GTH`), Académica (`ACD`) y Dirección de Creación y Contenido (`DCC`).
* **Exposición de portafolio:** Difundir los proyectos tecnológicos desarrollados, eventos organizados y logros de los miembros.
* **Atracción de talento:** Servir de plataforma de reclutamiento mediante el módulo interactivo de Convocatoria para captar nuevos integrantes.

---

## 2. Vista general de la arquitectura

El sistema está diseñado bajo una arquitectura de **Frontend en el cliente integrado con Backend-as-a-Service (BaaS)** mediante el patrón de componentes web:

* **Cliente Frontend:** Compuesto por interfaces responsivas desarrolladas en Astro y estilizadas de manera dinámica. Los componentes manejan su propia lógica de presentación y eventos.
* **Integración Directa BaaS:** La persistencia de datos y la administración de los registros se delegan en la nube a través del SDK oficial de Supabase.
* **Acceso Seguro:** El cliente se comunica con el backend interactuando con las variables expuestas en el navegador:
  * `SUPABASE_URL`: Dirección HTTP de acceso al proyecto.
  * `SUPABASE_ANON_KEY`: Token público para autenticación del cliente.
  * La seguridad de los datos está blindada mediante políticas de seguridad a nivel de fila (**RLS - Row Level Security**) configuradas en Supabase, lo cual asegura que un cliente anónimo solo pueda realizar inserciones (`INSERT`), bloqueando cualquier lectura (`SELECT`) o modificación.

---

## 3. Componentes principales y flujos

El sistema se estructura en tres capas principales:

1. **Frontend UI:** Componentes como `RegistroModal.astro` y la página `admin.astro` que interactúan directamente con el usuario.
2. **Capa de validación y control:** Funciones de validación implementadas en el cliente por **Jeanpier** y endpoints de API en Astro (`/api/postular` y `/api/admin-postulantes`) que actúan como middleware de validación dura, sanitización contra XSS y control de acceso.
3. **Persistencia (Base de Datos):** La capa de datos implementada en Supabase que expone la tabla `applicants`.

### Flujo de datos para Postulación:
* El postulante completa los datos solicitados en el formulario de la interfaz gráfica.
* Los scripts del frontend ejecutan validaciones previas de longitud, formato de correo y obligatoriedad.
* Se realiza una petición HTTP `POST` hacia la ruta `/api/postular`.
* El endpoint de la API recibe la petición, sanitiza los campos en inglés e invoca al SDK de Supabase con permisos administrativos (`supabaseAdmin`) para realizar la inserción segura en la tabla `applicants`.

---

## 4. Diagrama general del sistema

El siguiente diagrama detalla los flujos de comunicación y persistencia entre los diferentes componentes del sistema:

```mermaid
graph TD
    subgraph Cliente (Navegador)
        User([Usuario / Postulante]) -->|Completa datos| Form[RegistroModal.astro]
        Form -->|Validaciones de Formato| ClientVal[Script de Validación]
        Admin([Administrador]) -->|Accede| AdminUI[admin.astro]
    end

    subgraph Servidor (Astro Endpoints)
        ClientVal -->|POST /api/postular| API_Postular[postular.ts]
        AdminUI -->|GET /api/admin-postulantes| API_Admin[admin-postulantes.ts]
    end

    subgraph Persistencia (Supabase BaaS)
        API_Postular -->|Insert con supabaseAdmin| Supabase[(Supabase Engine)]
        API_Admin -->|Select con supabaseAdmin| Supabase
        Supabase -->|Estructura física| Table[(applicants Table)]
    end
```

---

## 5. Riesgos técnicos conocidos

* **Dependencia de infraestructura de terceros:** El sistema depende directamente del estado operativo del servicio en la nube de Supabase y la latencia de su API externa.
* **Exposición pública de variables del cliente:** La llave `SUPABASE_ANON_KEY` y la `SUPABASE_URL` se cargan en el cliente. Si bien es el estándar de Supabase, obliga a tener una configuración de políticas RLS perfectamente auditada en la tabla `applicants` para evitar que usuarios malintencionados lean o borren datos de otros postulantes utilizando herramientas externas.
* **Validaciones exclusivas:** Las limitaciones de validación estricta de formatos a nivel de interfaz de usuario deben estar perfectamente sincronizadas con las restricciones físicas de la tabla en PostgreSQL (como la restricción `UNIQUE` para el campo `email`) para evitar excepciones del servidor no controladas.
