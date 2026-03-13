# Panel de Administración (Convocatorias)

El panel de administración se ubica en la ruta `/admin` y su función principal es actuar como un **dashboard seguro** para la gestión de aspirantes de las convocatorias del Centro Cultural Unicode.

## Mecanismos de Seguridad

El módulo de inicio de sesión administrativo se encuentra protegido en el servidor (`/src/pages/api/admin-login.ts`) implementando buenas prácticas de seguridad y privacidad, conectándose al proxy u orquestación de la base de datos (Ej., Supabase). 

- **Protección de Accesos**: Requiere de credenciales (contraseña) con privilegios de administrador.
- **Prevención de Ataques (Fuerza Bruta)**: Cuenta con un sistema interno de *Rate Limiting* diseñado para bloquear intentos maliciosos al superar una cantidad repetida de fallos (*Lockout system*).
- **Control Antidebugging de Validadores**: Uso de estrategias de comparación de contraseñas mediante tiempo constante que evita los ataques de tipo *Timing Attack*.

## Utilidades del Dashboard

Una vez ingresando al módulo, provee herramientas de:

- **Visualización Analítica (Tabla)**: Presenta la totalidad de personas o postulantes registrados en las convocatorias.
- **Filtrado Avanzado y Búsqueda**: Funcionalidad para buscar rápidamente perfiles de interés, o filtrarlos por su estado u otras métricas.
- **Exportación de Datos (CSV)**: Otorga al usuario un botón directo para descargar todo el histórico o filtro de información del dashboard mediante un archivo separado por comas (*.csv*), destinado a un tratamiento de la información externa por áreas relevantes.
