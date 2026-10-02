# Operación de la convocatoria

La implementación cubre A (configuración), B (postulación y video) y F (estados, correos y registro central). Los datos se guardan en PostgreSQL/Supabase y los videos en un proveedor privado independiente. La configuración inicial mantiene la convocatoria cerrada.

El código se puede completar y probar sin acceso al Supabase anterior. Su activación requiere aplicar la migración en un proyecto bajo control del equipo, autorizar Drive y configurar el proveedor de correo. Una sesión iniciada en el navegador no sustituye las credenciales de servidor.

## Base de datos y despliegue

1. Acceder al proyecto autorizado de Supabase. Si se usa otro proyecto, conservar el anterior hasta recuperar las postulaciones históricas.
2. Ejecutar `supabase/migrations/20261002_recruitment.sql` una sola vez mediante SQL Editor o la herramienta de migraciones del equipo. La migración crea tablas `recruitment_*`, sus índices, RLS y funciones RPC. No modifica `public.applicants`.
3. Configurar las variables de servidor en el despliegue y volver a desplegar para que el proceso reciba sus valores. No subir archivos `.env` al repositorio.
4. Comprobar `/api/recruitment/config`: sin conexiones necesarias, la API devuelve `available: false`. El panel administrativo muestra qué integraciones están configuradas.
5. Entrar a `/admin/recruitment`, completar fechas con zona horaria, disponibilidad mínima, áreas habilitadas, cupos de integrantes, banco de preguntas y plantillas. Los cupos por área son vacantes de integrantes; el máximo de postulaciones es independiente y no supera 150.

| Variable | Uso |
| --- | --- |
| `PUBLIC_SUPABASE_URL` | URL del proyecto que recibirá las nuevas postulaciones. |
| `PUBLIC_SUPABASE_ANON_KEY` | Compatibilidad con las páginas existentes; no concede acceso a las tablas de convocatoria. |
| `SUPABASE_SERVICE_ROLE_KEY` | Acceso exclusivo del servidor a tablas y RPC. Nunca se entrega al navegador. |
| `ADMIN_PASSWORD` | Autenticación administrativa existente. |
| `RECRUITMENT_BASE_URL` | Origen HTTPS oficial, sin rutas: los correos generan sus enlaces desde esta dirección. |
| `RECRUITMENT_RESUME_ENCRYPTION_KEY` | Secreto independiente para cifrar los enlaces personales guardados en la cola. Conservarlo al migrar la base. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | OAuth de la cuenta que almacenará videos en Drive. |
| `DRIVE_VIDEO_FOLDER_ID` | Carpeta privada de los videos. Carpeta preparada: `1dMRW6-8H5W3XcHqdL_JiPnl8SuyEEK2J`. |
| `RESEND_API_KEY`, `RECRUITMENT_EMAIL_FROM` | Proveedor predeterminado de correo y remitente verificado. |
| `RECRUITMENT_EMAIL_PROVIDER` | `resend` para el transporte predeterminado. No es necesario usar Gmail para guardar videos en Drive. |
| `CRON_SECRET` | Credencial exclusiva del ejecutor de la cola de correos. |
| `RECRUITMENT_VIDEO_BUCKET` | Bucket privado cuando se selecciona Supabase Storage; predeterminado `recruitment-videos`. |

Usar un secreto aleatorio de al menos 32 bytes para los enlaces personales. La clave de cifrado no es la clave de Supabase; puede permanecer estable al cambiar de proyecto. El administrador compartido se registra como `administracion-compartida`. La autenticación actual no identifica individualmente a los integrantes de GTH.

## Autorizar Google Drive

La cuenta prevista es `ccunicode.desarrollo@gmail.com`. Mantener la carpeta restringida y compartirla únicamente con evaluadores autorizados. Los postulantes reciben una autorización temporal para un solo archivo; nunca reciben el access token, refresh token ni el client secret de Google.

En Google Cloud, habilitar Drive API, crear un cliente OAuth adecuado y autorizar acceso offline con la cuenta prevista. Obtener y guardar el refresh token en el gestor de secretos del despliegue. Las operaciones administrativas de acceso se realizan en el perfil **Unicode de Brave** indicado por el usuario.

Preferir el alcance `https://www.googleapis.com/auth/drive.file`. Este permiso cubre archivos creados por la aplicación o elegidos por el usuario mediante Google Picker. **La carpeta preparada manualmente en el navegador no queda autorizada para la aplicación por copiar su ID.** Antes de activar, seleccionarla mediante Picker con el mismo cliente OAuth, o crear una carpeta nueva mediante la propia aplicación y actualizar `DRIVE_VIDEO_FOLDER_ID`. El alcance amplio `drive` exige una evaluación distinta y no es el valor predeterminado. [Alcances oficiales de Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)

Verificar el modo de publicación de OAuth: los refresh tokens de aplicaciones externas en modo de prueba pueden caducar a los siete días. No dejar una autorización de prueba como conexión permanente de la convocatoria. También pueden revocarse por acciones del usuario o cambios de política. [Caducidad de OAuth](https://developers.google.com/identity/protocols/oauth2#expiration)

La carpeta requiere una prueba real: crear una autorización de carga, subir un video de prueba, verificarlo desde el servidor y reproducirlo con una cuenta evaluadora. Abrir Drive en Brave o comprobar su espacio disponible no demuestra que la API tenga esos permisos.

## Flujo y límites del video

- Se asignan desde el servidor dos preguntas diferentes de Motivación y Calce Cultural y dos de Colaboración y Resolución de Problemas. Sus textos quedan guardados con el borrador; editar el banco no cambia los cuatro textos ya asignados.
- El postulante responde las cuatro preguntas en un único video de máximo un minuto. La preparación y el ensayo de diez segundos no se guardan como respuesta.
- La grabación en la web utiliza una tasa de bits controlada. La carga alternativa acepta MP4/WebM y está disponible solamente después de una falla técnica registrada. Hay un intento inicial y un único reintento compartido entre nueva grabación y carga alternativa.
- La API verifica el archivo almacenado y analiza su contenido, tamaño y duración reales. El límite de duración incorpora 0,25 segundos de tolerancia para el cierre del contenedor; no se confía en un valor de duración enviado por el postulante.
- El valor inicial y máximo configurable es 20 MiB por archivo: 150 videos completos ocuparían como máximo 3.000 MiB, aproximadamente 2,93 GiB. Contando un intento inicial y un reintento por las 150 identidades, el máximo de contenido de esos archivos es 6.000 MiB, aproximadamente 5,86 GiB, más otros archivos de la cuenta. Los archivos enviados a la papelera de Drive siguen ocupando espacio hasta su eliminación definitiva. Un video de un minuto puede superar el límite por archivo si fue grabado externamente; el formulario debe comprobarlo antes de subirlo.
- Para limitar las cargas, el servidor reserva como máximo 150 identidades al iniciar un video o registrar la primera falla técnica. Un borrador con video iniciado utiliza esa reserva aunque finalmente no envíe la postulación. No se asignan reservas adicionales automáticamente por abandonar un borrador.
- La subida va del navegador a Drive mediante una sesión reanudable o a una URL de carga firmada de Supabase. El video completo no pasa por la función de recepción del formulario.
- Los evaluadores reproducen videos mediante su acceso privado a Drive o mediante un enlace firmado breve de Supabase. No se publican archivos como “cualquier persona con el enlace”.

El control de intentos es del servidor. La declaración de una falla técnica queda registrada con código y descripción; no certifica por sí sola que una persona estuvo presente durante la grabación. No se implementa supervisión de identidad ni proctoring.

Si se cambia a Supabase Storage, crear previamente el bucket privado, definir tamaño/tipos permitidos y probar sus permisos. Cambiar el selector de proveedor afecta nuevas sesiones de carga; los videos anteriores conservan su proveedor e identificador.

## Estados, correos y tareas periódicas

La postulación se confirma de manera atómica: campos completos, consentimiento, video validado, convocatoria dentro del plazo y espacio entre las 150 postulaciones. Los borradores no cuentan como confirmados. El correo se guarda en la misma transacción que el evento correspondiente.

Las transiciones de selección son manuales y requieren un motivo. El servidor impide retrocesos, saltos no permitidos y cambios de estados finales. Se conserva la historia de la transición y la etiqueta del actor. La revisión inicial, prueba, entrevista, dinámica, resultado y onboarding tienen estados preparados para la integración de los módulos respectivos.

Los correos usan plantillas de texto con `{{firstName}}`, `{{lastName}}`, `{{title}}`, `{{status}}` y `{{resumeUrl}}`. El enlace personal solo se admite en los correos de borrador y de postulación incompleta. La cola guarda sus enlaces cifrados y los endpoints administrativos de seguimiento no exponen esos secretos.

La creación del borrador, el envío definitivo y una transición administrativa intentan despachar la cola después de confirmar la operación en la base. Un fallo de correo conserva el borrador y su enlace, o la transición ya confirmada. Configurar además un ejecutor periódico que llame a `GET` o `POST /api/recruitment/admin/process-emails` con `Authorization: Bearer <CRON_SECRET>`; no incluir esa credencial en URLs. El panel permite ejecutar la cola autenticándose como administrador.

La cola reserva filas durante cinco minutos, evita reservas concurrentes, reintenta con espera creciente y permite cinco intentos como máximo. Un quinto intento cuya reserva vence sin confirmación queda fallido para revisión. Una respuesta sin identificador del proveedor no se registra como envío exitoso. El mismo trabajo utiliza siempre la misma clave de idempotencia en Resend; el proveedor la conserva 24 horas. Una confirmación perdida y reintentada fuera de esa ventana conserva un riesgo de duplicado, por lo que debe verificarse con el proveedor antes de reiniciar manualmente un trabajo fallido. [Idempotencia de Resend](https://resend.com/docs/dashboard/emails/idempotency-keys)

El procesador también marca borradores inactivos como incompletos y envía el recordatorio. Antes del cierre, el enlace personal permite retomarlos. Después del plazo, los borradores pendientes pasan a vencidos. La ejecución periódica es necesaria para hacer esas tareas incluso cuando nadie usa el sitio.

Definir con GTH un plazo de conservación de videos y registros antes de la convocatoria real. No borrar postulaciones ni reiniciar la base para liberar el límite. La configuración se versiona; se implementa una convocatoria actual. Un nuevo ciclo de estas tablas requiere incorporar un identificador de convocatoria y límites/unicidad por ciclo antes de reabrir para otra promoción.

## Pruebas locales y activación

La opción `RECRUITMENT_LOCAL_DB_PATH` funciona únicamente con Astro en desarrollo y utiliza PGlite, un motor PostgreSQL que ejecuta la misma migración. Guarda datos en el directorio local elegido y permite comprobar configuración, borradores, preguntas, estados y cola sin acceso remoto. Requiere `ADMIN_PASSWORD` local o una clave de cifrado independiente. **No es la persistencia compartida de producción** y no sustituye la conexión ni la prueba real de OAuth y correo.

Antes de abrir la convocatoria real:

1. Ejecutar las pruebas SQL, de cliente e integraciones incluidas, `npx astro check` y `npm run build`.
2. Aplicar y comprobar las RPC/RLS en Supabase: las claves anónimas y usuarios autenticados normales no deben poder consultar tablas privadas ni ejecutar RPC de servidor.
3. Crear una postulación de prueba, retomar el borrador en otro dispositivo y confirmar que mantiene las mismas preguntas.
4. Probar grabación MP4/WebM en computadoras y celulares reales, rechazo de audio o video mayor a un minuto, interrupción/reanudación y único reintento técnico.
5. Confirmar recepción del correo de borrador y del envío definitivo, reproducción privada por un evaluador y procesamiento periódico de la cola.
6. Revisar fechas en hora de Lima, disponibilidad mínima y contador de capacidad. Activar después desde el panel.

Las pruebas locales y los archivos de medios incluidos comprueban lógica y formatos; no certifican conectividad de producción, permisos reales de la carpeta, entrega del correo ni compatibilidad de cada dispositivo. Hasta completar esas comprobaciones, la integración externa queda pendiente de activación.

## Migrar a otro Supabase

Cerrar temporalmente la convocatoria y detener el ejecutor de correos mientras se realiza el cambio. Con acceso al proyecto de origen, respaldar y restaurar configuración, postulaciones, eventos, fallas técnicas, cargas, plantillas, cola y auditoría. Conservar los UUID y hashes de enlaces personales, y mantener la misma `RECRUITMENT_RESUME_ENCRYPTION_KEY` para descifrar mensajes pendientes. Aplicar la migración solo a una base nueva vacía; una restauración completa de esquema ya incluye sus funciones/tablas.

Actualizar URL y clave de servicio en el despliegue y comprobar enlaces personales, conteos, historial y cola antes de reabrir. Las referencias de Drive siguen apuntando a los mismos archivos si la cuenta OAuth y carpeta permanecen iguales. Si hay videos en Supabase Storage, copiar también los objetos y reconstruir los permisos del bucket: restaurar PostgreSQL no copia el contenido del almacenamiento. [Respaldo y restauración de Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)

Los datos históricos de `public.applicants` permanecen aparte. Sin acceso al Supabase anterior se puede abrir una nueva base para esta convocatoria, pero no se pueden recuperar sus postulaciones históricas por conocer únicamente su URL o identificador.

## Integraciones pendientes de otros bloques

No se implementan algoritmos de afinidad, evaluación subjetiva, calificación automática del video, agenda de entrevistas/dinámicas ni gestión completa del onboarding de C, D, E, G, H e I. F ofrece estados manuales, historia y plantillas para conectar esos procesos. Marcar “prueba enviada”, “entrevista programada” o “buddy asignado” registra una acción ya realizada por el módulo o por GTH; no crea por sí solo una prueba, cita o asignación real.
