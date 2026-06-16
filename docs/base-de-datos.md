# Base de Datos

## 1. Tecnologías y Configuración

El motor de persistencia para la landing page de Unicode utiliza una base de datos **PostgreSQL** administrada a través de la plataforma de backend como servicio **Supabase**.

La interacción y la ingesta de datos desde el cliente frontend se realizan de manera segura a través de la API REST nativa utilizando dos variables de entorno de acceso público:
* `SUPABASE_URL`: Endpoint seguro del API REST del proyecto.
* `SUPABASE_ANON_KEY`: Llave anónima pública del cliente para el control básico de acceso.

El acceso directo de lectura y escritura no autorizada a las tablas está restringido mediante **Políticas de Seguridad a Nivel de Fila (RLS - Row Level Security)**. La política de la base de datos permite exclusivamente operaciones de inserción (`INSERT`) originadas desde el cliente de la landing page para registrar postulaciones, manteniendo bloqueadas las operaciones de selección (`SELECT`), actualización (`UPDATE`) y eliminación (`DELETE`) para proteger datos sensibles de accesos no autorizados.

---

## 2. Modelo de Datos (Tabla: applicants)

Estructura física de la tabla `applicants` utilizada para consolidar las postulaciones de la convocatoria:

| Columna | Tipo de dato | Restricciones (Constraints) | Descripción (Propósito) |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | Primary Key, `default uuid_generate_v4()` | Identificador único global autogenerado para cada postulación. |
| `first_name` | `varchar(150)` | Not Null | Nombre o nombres del postulante. |
| `last_name` | `varchar(150)` | Not Null | Apellido o apellidos del postulante. |
| `email` | `varchar(150)` | Unique, Not Null | Correo electrónico de contacto único de cada postulante. |
| `phone` | `varchar(20)` | Not Null | Teléfono móvil o fijo de contacto del postulante. |
| `career` | `varchar(150)` | Not Null | Escuela profesional o carrera universitaria en curso. |
| `first_choice_area` | `varchar(150)` | Not Null, Check (IN ('ID', 'RRPP', 'GTH', 'ACD', 'DCC')) | Primera opción de área de postulación dentro de la organización. |
| `university` | `varchar(150)` | Not Null | Universidad de origen del postulante. |
| `university_semester` | `varchar(20)` | Not Null | Semestre o ciclo académico actual del postulante. |
| `application_reason` | `text` | Not Null | Motivos de postulación detallados para el ingreso a la organización. |
| `second_choice_area` | `varchar(150)` | Nullable, Check (NULL or IN ('ID', 'RRPP', 'GTH', 'ACD', 'DCC')) | Segunda opción opcional de área de postulación dentro de la organización. |
| `created_at` | `timestamptz` | Default: `now()` | Fecha y hora exacta en la que se realizó el registro en el sistema. |

---

## 3. Restricciones e Integridad de Datos (Constraints & Indexes)

* **Restricción de Unicidad (`UNIQUE`):** Implementada en la columna `email` para garantizar la integridad lógica del proceso de admisión, previniendo que un mismo correo electrónico pueda registrar múltiples postulaciones dentro de la misma base de datos.
* **Restricción de Verificación (`CHECK`):** Las columnas `first_choice_area` y `second_choice_area` están sujetas a una restricción de validación estricta a nivel de base de datos para asegurar que únicamente contengan las siglas válidas de las áreas autorizadas de la organización: `'GTH'` (Gestión de Talento Humano), `'ACD'` (Académica), `'RRPP'` (Relaciones Públicas), `'DCC'` (Dirección de Creación y Contenido) e `'ID'` (Investigación y Desarrollo).
* **Integración con Frontend:** Estas restricciones a nivel de esquema actúan como la última línea de defensa de la integridad de los datos. En el frontend, el formulario de la landing valida la estructura del payload (formatos de correo, caracteres permitidos, obligatoriedad y límites de caracteres) de manera equivalente antes del envío, garantizando una experiencia de usuario consistente y un flujo de datos limpio.

---

## 4. Sentencias de Creación (DDL SQL)

Sentencia DDL SQL declarativa completa para inicializar la tabla con sus respectivas restricciones de validación e integridad:

```sql
-- Create applicants table for landing page registrations
CREATE TABLE applicants (
    -- Unique identifier using uuid
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Personal details
    first_name VARCHAR(150) NOT NULL,
    last_name VARCHAR(150) NOT NULL,
    
    -- Contact details
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    
    -- Academic info
    career VARCHAR(150) NOT NULL,
    university VARCHAR(150) NOT NULL,
    university_semester VARCHAR(20) NOT NULL,
    
    -- Application options constrained to valid areas
    first_choice_area VARCHAR(150) NOT NULL CHECK (first_choice_area IN ('ID', 'RRPP', 'GTH', 'ACD', 'DCC')),
    second_choice_area VARCHAR(150) NULL CHECK (second_choice_area IS NULL OR second_choice_area IN ('ID', 'RRPP', 'GTH', 'ACD', 'DCC')),
    
    -- Text area for statement of purpose
    application_reason TEXT NOT NULL,
    
    -- Auto-generated timestamp
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Performance Indexes
CREATE INDEX idx_applicants_choices ON applicants(first_choice_area, second_choice_area);
CREATE INDEX idx_applicants_created_at ON applicants(created_at DESC);
```

---

## 5. Gestión de Migraciones y Semillas (Seeds)

En la fase actual del desarrollo, la definición de la estructura física de la base de datos se almacena en el archivo declarativo [schema.sql](../../supabase/schema.sql) ubicado en el directorio `/supabase/` en la raíz.

### Pasos para replicar el esquema en un nuevo proyecto de Supabase:
1. **Acceso al Dashboard**: Inicie sesión en el panel de control de **Supabase** y navegue hacia el proyecto correspondiente.
2. **Editor de SQL**: En la barra lateral izquierda, seleccione la herramienta **SQL Editor**.
3. **Cargar Estructura**: Cree una nueva consulta (*New Query*), copie la totalidad del contenido del archivo `supabase/schema.sql` y péguelo en el editor SQL.
4. **Ejecución**: Presione el botón **Run** para crear la tabla `applicants` con sus respectivas restricciones de validación y los índices de rendimiento optimizados.
5. **Configuración RLS**: Asegúrese de ir a la sección **Database > Policies** en Supabase para habilitar las políticas de seguridad a nivel de fila (*Row Level Security*), configurando permisos exclusivos de `INSERT` para roles públicos y restringiendo lecturas a la capa del servidor.
