# Correos de evaluación a directores

Cada correo reúne en Para los nombres y correos registrados de todos los directores del área. El contenido y la cola son independientes por área.

- Pendientes: un correo inicial y después uno por día a partir de las 09:00 de Lima, únicamente si quedan evaluaciones sin decisión final. Desglosa primera y segunda opción según la asignación actual; excluye pruebas y borradores.
- Segunda opción: un correo por cada pase ocurrido después de la activación inicial. No se avisan pases históricos. El worker procesa la cola cada cinco minutos; su ejecución puede sufrir retrasos del scheduler.
- Cierre: al quedar sin pendientes un área que tuvo pendientes durante la campaña, invita a cerrar recepción. Repite 48 horas después de un envío confirmado mientras continúe abierta y sin pendientes. El correo no cierra el área.
- Fin: domingo 18 de octubre de 2026, 23:59, America/Lima. Desde el lunes 19 a las 00:00 (05:00 UTC) no se inicia ningún envío ni reintento de esta campaña. Los correos a postulantes conservan su política existente.

## Activación

Aplicar `supabase/migrations/20261021_recruitment_director_reminders.sql` antes de desplegar el código del servidor. Reutiliza el worker existente y las credenciales de correo actuales. La primera ejecución de procesamiento sin pausa y con proveedor configurado inicializa la campaña y genera solo avisos de pendientes. Las siguientes ejecuciones habilitan avisos de nuevos pases y de cierre.

Si el servidor se despliega antes de aplicar la migración, omite temporalmente la campaña de directores y registra una advertencia; los correos existentes a postulantes continúan procesándose. Al aplicar la migración, el siguiente procesamiento activa la campaña.

La pausa global de correos también afecta a esta campaña. Los destinatarios se consultan al reservar cada envío para reflejar los directores actualmente registrados. La cola usa reservas, reintentos limitados e identificadores estables para el proveedor. Las pruebas locales solo pueden enviar si todos los destinatarios están autorizados en `RECRUITMENT_LOCAL_EMAIL_TO`.

## Aviso de finalización global

Aplicar también `supabase/migrations/20261022_recruitment_completion_notice.sql`. Envía un único aviso a `lenin.castro.a@uni.pe` cuando no quedan evaluaciones pendientes en ninguna área, incluyendo primera y segunda opción. No exige que las áreas cierren recepción. El correo enumera las áreas sin pendientes e indica cuáles siguen abiertas. Requiere al menos una postulación real enviada; las pruebas y los borradores no disparan el aviso.

Reutiliza el worker, la pausa global y el corte del domingo 18 a las 23:59 de Lima. Si ya se completó todo al activar la función, avisa en el siguiente procesamiento. Las reservas y los reintentos conservan el identificador del correo; una entrega confirmada desactiva nuevos avisos de finalización. La ausencia de esta migración no bloquea los avisos existentes a directores.
