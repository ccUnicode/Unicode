-- Recruitment A/B/F. Existing public.applicants and its historical data are untouched.
-- Apply using an owner connection. Only the server service_role can invoke these RPCs.
create table public.recruitment_config (
  singleton boolean primary key default true check (singleton), settings jsonb not null,
  revision integer not null default 1, updated_at timestamptz not null default now()
);
create table public.recruitment_applications (
  id uuid primary key, token_hash text not null, data jsonb not null,
  questions jsonb not null check (jsonb_array_length(questions)=4),
  status text not null default 'draft' check (status in ('draft','incomplete','expired','submitted','profile_validated','profile_rejected','test_sent','test_completed','awaiting_second_review','interview_eligible','interview_ineligible','interview_scheduled','interviewed','group_eligible','group_scheduled','group_completed','selected','conditional_selected','waitlisted','not_selected','onboarding_sent','buddy_assigned','integrated','discarded','withdrawn')),
  video jsonb, technical_failure_count integer not null default 0 check (technical_failure_count between 0 and 1),
  recording_attempts integer not null default 0 check (recording_attempts between 0 and 2),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), submitted_at timestamptz
);
create unique index recruitment_unique_email on public.recruitment_applications((data->>'email'));
create table public.recruitment_events (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.recruitment_applications(id),
  from_status text, to_status text not null, actor text not null, reason text not null,
  created_at timestamptz not null default now()
);
create table public.recruitment_technical_failures (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.recruitment_applications(id),
  code text not null, message text not null, created_at timestamptz not null default now()
);
create table public.recruitment_uploads (
  id uuid primary key, application_id uuid not null references public.recruitment_applications(id),
  provider text not null check (provider in ('drive','supabase')), file_id text,
  mode text not null check (mode in ('recording','upload')), content_type text not null, expected_bytes bigint not null,
  max_bytes bigint not null, max_seconds integer not null, attempt_no integer not null,
  status text not null default 'reserved' check (status in ('reserved','pending','completed','failed')), upload_authorization jsonb,
  created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '2 hours'
);
create unique index recruitment_one_upload_per_attempt on public.recruitment_uploads(application_id,attempt_no);
create unique index recruitment_one_live_upload on public.recruitment_uploads(application_id) where status in ('reserved','pending');
create table public.recruitment_email_templates (
  key text primary key, subject text not null, body text not null, enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
create table public.recruitment_email_outbox (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.recruitment_applications(id),
  template_key text not null, recipient text not null, subject text not null, body text not null, payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','leased','sent','failed')),
  attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
  lease_token uuid, leased_until timestamptz, provider_message_id text, last_error text,
  created_at timestamptz not null default now(), sent_at timestamptz,
  unique(application_id, template_key)
);
create table public.recruitment_rate_limits (key text primary key, window_start timestamptz not null, count integer not null);
create table public.recruitment_config_events (
  id uuid primary key default gen_random_uuid(), actor text not null, kind text not null,
  before_value jsonb, after_value jsonb, created_at timestamptz not null default now()
);
create index recruitment_applications_submitted on public.recruitment_applications(submitted_at) where submitted_at is not null;
create index recruitment_events_application on public.recruitment_events(application_id,created_at);
create index recruitment_outbox_due on public.recruitment_email_outbox(next_attempt_at) where status in ('pending','leased');

insert into public.recruitment_config(settings) values ('{
 "enabled":false,"title":"Convocatoria UNICode","opensAt":null,"closesAt":null,"extensionAt":null,
 "maxApplicants":150,"minAvailabilityHours":null,"maxVideoSeconds":60,"maxVideoBytes":20971520,
 "questionsPerCategory":2,"preparationSeconds":30,"inactivityHours":24,
 "shortCasePrompt":"Describe cómo abordarías un problema habitual del área a la que postulas.","storageProvider":"drive",
 "thresholds":{"affinity":null,"written":null,"video":null},
 "videoRubric":[
 {"id":"communication","label":"Comunicación y síntesis","low":"Le cuesta estructurar la idea, muletillas, mal manejo del tiempo.","medium":"Idea clara, estructura básica, dentro del tiempo.","high":"Fluidez, dicción, directo al punto, discurso estructurado.","maxScore":5},
 {"id":"motivation","label":"Motivación y fit cultural","low":"Desinterés, respuestas genéricas, solo busca certificado.","medium":"Entiende el propósito y muestra interés genuino.","high":"Entusiasmo contagioso, alineado con la cultura, deseo de aportar.","maxScore":5},
 {"id":"proactivity","label":"Proactividad y resiliencia","low":"Actitud pasiva, culpa a otros, sin iniciativa.","medium":"Reconoce retos, resuelve, aprende de errores.","high":"Liderazgo natural, autogestión, orientación a soluciones.","maxScore":5}],
 "areas":[{"id":"ID","name":"Investigación y Desarrollo","enabled":true,"quota":null},{"id":"RRPP","name":"Relaciones Públicas","enabled":true,"quota":null},{"id":"GTH","name":"Gestión del Talento Humano","enabled":true,"quota":null},{"id":"ACD","name":"Académica","enabled":true,"quota":null},{"id":"DCC","name":"Dirección de Comunicación y Contenido","enabled":true,"quota":null},{"id":"LGE","name":"Logística y Gestión de Eventos","enabled":true,"quota":null}],
 "questions":[
 {"id":"motivation-1","category":"motivation","text":"Si tuvieras que explicarle a alguien qué es CCUnicode en 30 segundos, ¿qué le dirías?","enabled":true},
 {"id":"motivation-2","category":"motivation","text":"¿Qué área de CCUnicode te llama más la atención y qué crees que podrías aportarle?","enabled":true},
 {"id":"motivation-3","category":"motivation","text":"¿Qué significa para ti formar parte de una comunidad, y no solo tener un certificado o línea en el CV?","enabled":true},
 {"id":"motivation-4","category":"motivation","text":"Cuéntanos de algo que hayas aprendido de forma autodidacta en el último año.","enabled":true},
 {"id":"motivation-5","category":"motivation","text":"¿Qué actividad, proyecto o comunidad (dentro o fuera de la universidad) te ha hecho sentir más comprometido últimamente, y por qué?","enabled":true},
 {"id":"collaboration-1","category":"collaboration","text":"Si en un proyecto grupal alguien no está cumpliendo su parte, ¿qué harías?","enabled":true},
 {"id":"collaboration-2","category":"collaboration","text":"Describe un proyecto o reto donde los resultados no fueron los esperados. ¿Qué hiciste para superarlo y qué aprendiste?","enabled":true},
 {"id":"collaboration-3","category":"collaboration","text":"Cuéntanos de una vez en la que tuviste que tomar la iniciativa sin que nadie te lo pidiera.","enabled":true},
 {"id":"collaboration-4","category":"collaboration","text":"Describe un momento en que recibiste una crítica o feedback que no esperabas. ¿Cómo reaccionaste?","enabled":true},
 {"id":"collaboration-5","category":"collaboration","text":"Cuéntanos de una situación en la que tuviste que aprender algo nuevo muy rápido para resolver un problema.","enabled":true}
 ]
}'::jsonb);
insert into public.recruitment_email_templates(key,subject,body) values
 ('resume','Continúa tu postulación a {{title}}','Hola {{firstName}}, guarda este enlace personal para continuar tu postulación: {{resumeUrl}}. No lo compartas. Tu postulación se confirmará al enviar los datos y el video.'),
 ('submitted','Recibimos tu postulación a {{title}}','Hola {{firstName}}, recibimos correctamente tu postulación y tu video. Te avisaremos cuando exista una actualización.'),
 ('profile_validated','Perfil validado en {{title}}','Hola {{firstName}}, tu perfil cumple los requisitos iniciales. GTH te comunicará los siguientes pasos.'),
 ('profile_rejected','Resultado inicial de {{title}}','Hola {{firstName}}, agradecemos tu interés. Tu perfil no cumple los requisitos iniciales de esta convocatoria.'),
 ('test_sent','Prueba de {{title}}','Hola {{firstName}}, GTH registró el envío de tu prueba. Revisa las indicaciones y el plazo coordinados.'),
 ('test_completed','Prueba completada en {{title}}','Hola {{firstName}}, recibimos tu prueba. Te comunicaremos el resultado de su evaluación.'),
 ('awaiting_second_review','Revisión de tu prueba de {{title}}','Hola {{firstName}}, tu prueba está pendiente de una segunda revisión. Te comunicaremos el resultado.'),
 ('interview_eligible','Avance a entrevista en {{title}}','Hola {{firstName}}, tu postulación avanzó a entrevista. GTH coordinará los detalles contigo.'),
 ('interview_ineligible','Resultado de {{title}}','Hola {{firstName}}, agradecemos tu participación. Tu postulación no avanzará a entrevista.'),
 ('interview_scheduled','Entrevista de {{title}}','Hola {{firstName}}, tu postulación tiene una entrevista programada. Revisa los detalles coordinados con GTH.'),
 ('interviewed','Actualización de tu postulación a {{title}}','Hola {{firstName}}, registramos que tu entrevista fue realizada. Te comunicaremos la decisión de selección.'),
 ('group_eligible','Avance a dinámica de {{title}}','Hola {{firstName}}, tu postulación avanzó a la dinámica grupal. GTH coordinará los detalles contigo.'),
 ('group_scheduled','Dinámica grupal de {{title}}','Hola {{firstName}}, tu dinámica grupal está programada. Revisa los detalles coordinados con GTH.'),
 ('group_completed','Dinámica completada en {{title}}','Hola {{firstName}}, registramos tu participación en la dinámica grupal. Te comunicaremos la decisión de selección.'),
 ('selected','Resultado de {{title}}','Hola {{firstName}}, has sido seleccionado/a. GTH te comunicará los pasos de incorporación.'),
 ('conditional_selected','Selección condicional en {{title}}','Hola {{firstName}}, registramos tu selección condicional. GTH te comunicará las condiciones y los pasos siguientes.'),
 ('waitlisted','Lista de espera de {{title}}','Hola {{firstName}}, tu postulación quedó en lista de espera. GTH te avisará si se libera un cupo.'),
 ('not_selected','Resultado de {{title}}','Hola {{firstName}}, agradecemos tu participación. Tu postulación no fue seleccionada en esta convocatoria.'),
 ('discarded','Resultado de {{title}}','Hola {{firstName}}, agradecemos tu interés en CCUNICode. Tu postulación no continuará en esta convocatoria.'),
 ('onboarding_sent','Incorporación a CCUNICode','Hola {{firstName}}, GTH registró el envío de la información de incorporación. Sigue las indicaciones coordinadas.'),
 ('buddy_assigned','Acompañamiento en CCUNICode','Hola {{firstName}}, GTH registró la asignación de una persona que te acompañará en tu incorporación.'),
 ('integrated','Bienvenido/a a CCUNICode','Hola {{firstName}}, registramos que tu incorporación a CCUNICode se completó.'),
 ('incomplete','Completa tu postulación a {{title}}','Hola {{firstName}}, tu postulación sigue incompleta. Puedes retomarla dentro del plazo con tu enlace personal: {{resumeUrl}}.'),
 ('expired','Plazo vencido de {{title}}','Hola {{firstName}}, el plazo terminó y tu postulación quedó incompleta. Gracias por tu interés en CCUNICode.');

-- Private helper. Authentication uses an opaque random bearer token hashed by the server.
create function public.recruitment_require_owner(p_id uuid,p_token_hash text)
returns public.recruitment_applications language plpgsql set search_path=public as $$
declare a recruitment_applications;
begin
 select * into a from recruitment_applications where id=p_id and token_hash=p_token_hash for update;
 if not found then raise exception 'unauthorized: Enlace personal inválido o no autorizado.'; end if;
 return a;
end $$;
create function public.recruitment_application_json(p_id uuid,p_history boolean default false)
returns jsonb language sql set search_path=public as $$
 select jsonb_build_object('id',a.id,'data',a.data,'questions',a.questions,'status',a.status,'video',a.video,
 'technicalFailureCount',a.technical_failure_count,'recordingAttempts',a.recording_attempts,
 'alternateAllowed',a.technical_failure_count=1 and a.recording_attempts<2 and a.video is null and a.status in ('draft','incomplete'),
 'createdAt',a.created_at,'updatedAt',a.updated_at,'submittedAt',a.submitted_at) ||
 case when p_history then jsonb_build_object('history',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'fromStatus',e.from_status,'toStatus',e.to_status,'actor',e.actor,'reason',e.reason,'createdAt',e.created_at) order by e.created_at) from recruitment_events e where e.application_id=a.id),'[]'::jsonb)) else '{}'::jsonb end
 from recruitment_applications a where a.id=p_id
$$;
create function public.recruitment_assert_open() returns jsonb language plpgsql set search_path=public as $$
declare c jsonb;
begin
 select settings into c from recruitment_config where singleton for update;
 if not coalesce((c->>'enabled')::boolean,false) then raise exception 'call_closed: La convocatoria se encuentra cerrada.'; end if;
 if c->>'opensAt' is null or c->>'closesAt' is null or c->>'minAvailabilityHours' is null then raise exception 'configuration: La convocatoria aún no está configurada.'; end if;
 if now()<(c->>'opensAt')::timestamptz then raise exception 'call_not_started: La convocatoria todavía no abrió.'; end if;
 if now()>coalesce((c->>'extensionAt')::timestamptz,(c->>'closesAt')::timestamptz) then raise exception 'call_expired: El plazo de postulación terminó.'; end if;
 return c;
end $$;
create function public.recruitment_enqueue(p_id uuid,p_key text,p_extra jsonb default '{}'::jsonb)
returns void language plpgsql set search_path=public as $$
begin
 insert into recruitment_email_outbox(application_id,template_key,recipient,subject,body,payload)
 select a.id,t.key,a.data->>'email',t.subject,t.body,
 jsonb_build_object('firstName',a.data->>'firstName','lastName',a.data->>'lastName','status',a.status,'title',c.settings->>'title')||p_extra
 from recruitment_applications a cross join recruitment_config c cross join recruitment_email_templates t
 where a.id=p_id and t.key=p_key and t.enabled
 on conflict(application_id,template_key) do nothing;
end $$;
create function public.recruitment_public_config() returns jsonb language plpgsql set search_path=public as $$
declare c jsonb; available boolean:=false; reason text;
begin
 select settings||jsonb_build_object('revision',revision) into c from recruitment_config;
 begin perform recruitment_assert_open(); available:=true; exception when others then reason:=split_part(sqlerrm,': ',2); end;
 if available and (select count(*) from recruitment_applications where submitted_at is not null)>=(c->>'maxApplicants')::integer then available:=false;reason:='Se alcanzó el máximo de postulaciones.';end if;
 return jsonb_build_object('config',c-'questions'-'thresholds'-'storageProvider','available',available,'reason',reason);
end $$;
create function public.recruitment_create_draft(p_id uuid,p_token_hash text,p_data jsonb,p_rate_key text,p_resume_secret text)
returns jsonb language plpgsql set search_path=public as $$
declare c jsonb; questions jsonb; rate_count integer;
begin
 c:=recruitment_assert_open();
 if (select count(*) from recruitment_applications where submitted_at is not null)>=(c->>'maxApplicants')::integer then raise exception 'capacity: Se alcanzó el máximo de postulaciones.';end if;
 if (select count(*) from recruitment_applications where recording_attempts>0)>=(c->>'maxApplicants')::integer then raise exception 'capacity: Se alcanzó el máximo de postulantes con video iniciado. Los enlaces existentes pueden continuar dentro del plazo.';end if;
 insert into recruitment_rate_limits(key,window_start,count) values(p_rate_key,now(),1)
 on conflict(key) do update set count=case when recruitment_rate_limits.window_start<now()-interval '1 hour' then 1 else recruitment_rate_limits.count+1 end,
 window_start=case when recruitment_rate_limits.window_start<now()-interval '1 hour' then now() else recruitment_rate_limits.window_start end returning count into rate_count;
 -- Campus networks and mobile carriers share public IPs; the unique email and global caps bound the rest.
 if rate_count>coalesce((c->>'draftsPerIpPerHour')::integer,30) then raise exception 'rate_limited: Demasiados registros desde esta conexión. Intenta más tarde.';end if;
 if (select count(*) from recruitment_applications where status in ('draft','incomplete'))>=450 then raise exception 'capacity: No podemos recibir más borradores en este momento.';end if;
 select jsonb_agg(q order by q->>'category',q->>'id') into questions from (
   (select item-'enabled' as q from jsonb_array_elements(c->'questions') item where item->>'category'='motivation' and coalesce((item->>'enabled')::boolean,true) order by random() limit 2)
   union all
   (select item-'enabled' as q from jsonb_array_elements(c->'questions') item where item->>'category'='collaboration' and coalesce((item->>'enabled')::boolean,true) order by random() limit 2)
 ) assigned;
 if coalesce(jsonb_array_length(questions),0)<>4 then raise exception 'configuration: Faltan preguntas habilitadas en el banco.';end if;
 insert into recruitment_applications(id,token_hash,data,questions) values(p_id,p_token_hash,p_data,questions);
 insert into recruitment_events(application_id,from_status,to_status,actor,reason) values(p_id,null,'draft','postulante','Borrador creado; preguntas asignadas.');
 perform recruitment_enqueue(p_id,'resume',jsonb_build_object('resumeSecret',p_resume_secret));
 return jsonb_build_object('application',recruitment_application_json(p_id));
exception when unique_violation then raise exception 'duplicate: Este correo ya tiene una postulación. Usa tu enlace personal para continuar.';
end $$;
create function public.recruitment_get_draft(p_id uuid,p_token_hash text) returns jsonb language plpgsql set search_path=public as $$
begin perform recruitment_require_owner(p_id,p_token_hash);return jsonb_build_object('application',recruitment_application_json(p_id));end $$;
create function public.recruitment_patch_draft(p_id uuid,p_token_hash text,p_data jsonb) returns jsonb language plpgsql set search_path=public as $$
declare a recruitment_applications;
begin
 perform recruitment_assert_open();a:=recruitment_require_owner(p_id,p_token_hash);
 if a.status not in ('draft','incomplete') then raise exception 'immutable: Esta postulación ya no admite modificaciones.';end if;
 if p_data->>'email'<>a.data->>'email' then raise exception 'immutable: El correo del enlace personal no puede cambiarse.';end if;
 update recruitment_applications set data=p_data,status='draft',updated_at=now() where id=p_id;
 if a.status='incomplete' then insert into recruitment_events(application_id,from_status,to_status,actor,reason) values(p_id,'incomplete','draft','postulante','Borrador retomado dentro del plazo.');end if;
 return jsonb_build_object('application',recruitment_application_json(p_id));
end $$;
create function public.recruitment_recording_attempt(p_id uuid,p_token_hash text) returns jsonb language plpgsql set search_path=public as $$
declare a recruitment_applications; c jsonb;
begin
 c:=recruitment_assert_open();a:=recruitment_require_owner(p_id,p_token_hash);
 if a.status not in ('draft','incomplete') or a.video is not null then raise exception 'immutable: No puedes iniciar otra grabación.';end if;
 if a.recording_attempts>=1+a.technical_failure_count then raise exception 'attempts_exhausted: No quedan intentos de grabación. Registra una falla técnica si corresponde.';end if;
 if a.recording_attempts=0 and (select count(*) from recruitment_applications where recording_attempts>0)>=(c->>'maxApplicants')::integer then raise exception 'capacity: Se alcanzó el máximo de postulantes con video iniciado.';end if;
 update recruitment_applications set recording_attempts=recording_attempts+1,updated_at=now() where id=p_id;
 return jsonb_build_object('application',recruitment_application_json(p_id));
end $$;
create function public.recruitment_technical_failure(p_id uuid,p_token_hash text,p_code text,p_message text) returns jsonb language plpgsql set search_path=public as $$
declare a recruitment_applications; c jsonb;
begin
 c:=recruitment_assert_open();a:=recruitment_require_owner(p_id,p_token_hash);
 if a.status not in ('draft','incomplete') or a.video is not null then raise exception 'immutable: No puedes reemplazar un video validado.';end if;
 if a.technical_failure_count>=1 then raise exception 'attempts_exhausted: Ya utilizaste el reintento por falla técnica.';end if;
 if a.recording_attempts=0 and (select count(*) from recruitment_applications where recording_attempts>0)>=(c->>'maxApplicants')::integer then raise exception 'capacity: Se alcanzó el máximo de postulantes con video iniciado.';end if;
 insert into recruitment_technical_failures(application_id,code,message) values(p_id,left(p_code,80),left(p_message,500));
 update recruitment_applications set technical_failure_count=1,recording_attempts=greatest(recording_attempts,1),updated_at=now() where id=p_id;
 update recruitment_uploads set status='failed' where application_id=p_id and status in ('reserved','pending');
 return jsonb_build_object('application',recruitment_application_json(p_id));
end $$;
create function public.recruitment_begin_upload(p_id uuid,p_token_hash text,p_upload_id uuid,p_mode text,p_content_type text,p_bytes bigint)
returns jsonb language plpgsql set search_path=public as $$
declare a recruitment_applications; c jsonb; u recruitment_uploads;
begin
 c:=recruitment_assert_open();a:=recruitment_require_owner(p_id,p_token_hash);
 if a.status not in ('draft','incomplete') or a.video is not null then raise exception 'immutable: El video ya fue confirmado.';end if;
 if p_mode not in ('recording','upload') or p_content_type not in ('video/mp4','video/webm') or p_bytes<1 or p_bytes>(c->>'maxVideoBytes')::bigint then raise exception 'invalid_video: El formato o tamaño del video no está permitido.';end if;
 select * into u from recruitment_uploads where application_id=p_id and status in ('reserved','pending') for update;
 if found then
   -- An applicant who closed the browser keeps the same attempt and file: renew the
   -- reservation and drop the stale capability so the server issues a new one.
   if u.expires_at<now() then
     update recruitment_uploads set expires_at=now()+interval '2 hours',upload_authorization=null where id=u.id returning * into u;
   end if;
   if u.mode<>p_mode or u.content_type<>p_content_type or u.expected_bytes<>p_bytes then raise exception 'upload_pending: Ya existe una carga pendiente para otro archivo.';end if;
   if u.status='reserved' and u.created_at>now()-interval '30 seconds' then raise exception 'upload_in_progress: La autorización de carga aún se está preparando. Vuelve a intentar en unos segundos.';end if;
   return jsonb_build_object('upload',jsonb_build_object('id',u.id,'provider',u.provider,'fileId',u.file_id,'mode',u.mode,'contentType',u.content_type,'expectedBytes',u.expected_bytes,'maxBytes',u.max_bytes,'maxSeconds',u.max_seconds,'status',u.status,'authorization',u.upload_authorization));
 end if;
 if p_mode='upload' then
   if a.technical_failure_count<>1 or a.recording_attempts>=2 then raise exception 'alternate_not_allowed: La carga alternativa requiere una falla técnica registrada y solo permite un intento.';end if;
   update recruitment_applications set recording_attempts=recording_attempts+1,updated_at=now() where id=p_id;
   a.recording_attempts:=a.recording_attempts+1;
 elsif a.recording_attempts<=a.technical_failure_count or a.recording_attempts<1 or exists(select 1 from recruitment_uploads where application_id=p_id and attempt_no=a.recording_attempts) then raise exception 'recording_required: Inicia primero un intento de grabación válido en la web.';
 end if;
 insert into recruitment_uploads(id,application_id,provider,mode,content_type,expected_bytes,max_bytes,max_seconds,attempt_no)
 values(p_upload_id,p_id,c->>'storageProvider',p_mode,p_content_type,p_bytes,(c->>'maxVideoBytes')::bigint,60,a.recording_attempts) returning * into u;
 return jsonb_build_object('upload',jsonb_build_object('id',u.id,'provider',u.provider,'fileId',u.file_id,'mode',u.mode,'contentType',u.content_type,'expectedBytes',u.expected_bytes,'maxBytes',u.max_bytes,'maxSeconds',u.max_seconds,'status',u.status));
end $$;
create function public.recruitment_attach_upload(p_id uuid,p_token_hash text,p_upload_id uuid,p_provider text,p_file_id text,p_authorization jsonb)
returns void language plpgsql set search_path=public as $$
begin
 perform recruitment_require_owner(p_id,p_token_hash);
 update recruitment_uploads set provider=p_provider,file_id=p_file_id,status='pending',upload_authorization=p_authorization
 where id=p_upload_id and application_id=p_id and provider=p_provider and status in ('reserved','pending') and (file_id is null or file_id=p_file_id);
 if not found then raise exception 'upload_not_found: No se pudo asociar esta carga.';end if;
end $$;
create function public.recruitment_upload_for_validation(p_id uuid,p_token_hash text,p_upload_id uuid)
returns jsonb language plpgsql set search_path=public as $$
declare u recruitment_uploads;
begin
 perform recruitment_require_owner(p_id,p_token_hash);
 select * into u from recruitment_uploads where id=p_upload_id and application_id=p_id and status in ('pending','completed');
 if not found or u.file_id is null then raise exception 'upload_not_found: No existe una carga pendiente para verificar.';end if;
 return jsonb_build_object('upload',jsonb_build_object('id',u.id,'provider',u.provider,'fileId',u.file_id,'mode',u.mode,'contentType',u.content_type,'expectedBytes',u.expected_bytes,'maxBytes',u.max_bytes,'maxSeconds',u.max_seconds,'status',u.status));
end $$;
create function public.recruitment_complete_upload(p_id uuid,p_token_hash text,p_upload_id uuid,p_metadata jsonb)
returns jsonb language plpgsql set search_path=public as $$
declare a recruitment_applications; u recruitment_uploads;
begin
 perform recruitment_assert_open();a:=recruitment_require_owner(p_id,p_token_hash);
 if a.video->>'uploadId'=p_upload_id::text then return jsonb_build_object('application',recruitment_application_json(p_id));end if;
 if a.status not in ('draft','incomplete') or a.video is not null then raise exception 'immutable: El video ya fue confirmado.';end if;
 select * into u from recruitment_uploads where id=p_upload_id and application_id=p_id and status='pending' for update;
 if not found or u.expires_at<now() then raise exception 'upload_not_found: La carga no existe o venció.';end if;
 if jsonb_typeof(p_metadata->'hasVideo') is distinct from 'boolean' or jsonb_typeof(p_metadata->'bytes') is distinct from 'number'
 or jsonb_typeof(p_metadata->'durationSeconds') is distinct from 'number' or jsonb_typeof(p_metadata->'contentType') is distinct from 'string' then raise exception 'invalid_video: No se pudo verificar el contenido y la duración del archivo.';end if;
 if not coalesce((p_metadata->>'hasVideo')::boolean,false) or (p_metadata->>'bytes')::bigint<1 or (p_metadata->>'bytes')::bigint>u.max_bytes
 or (p_metadata->>'bytes')::bigint<>u.expected_bytes or (p_metadata->>'durationSeconds')::numeric<=0
 or (p_metadata->>'durationSeconds')::numeric>u.max_seconds+0.25 or p_metadata->>'contentType' not in ('video/mp4','video/webm') then
   raise exception 'invalid_video: El archivo real debe contener video de máximo 60 segundos y respetar el tamaño permitido.';
 end if;
 update recruitment_uploads set status='completed' where id=u.id;
 update recruitment_applications set video=jsonb_build_object('provider',u.provider,'fileId',u.file_id,'uploadId',u.id,'mode',u.mode,'bytes',(p_metadata->>'bytes')::bigint,'durationSeconds',(p_metadata->>'durationSeconds')::numeric,'contentType',p_metadata->>'contentType','verifiedAt',now()),updated_at=now() where id=p_id;
 return jsonb_build_object('application',recruitment_application_json(p_id));
end $$;
create function public.recruitment_submit(p_id uuid,p_token_hash text) returns jsonb language plpgsql set search_path=public as $$
declare a recruitment_applications; c jsonb; area jsonb; field text;
begin
 c:=recruitment_assert_open();a:=recruitment_require_owner(p_id,p_token_hash);
 if a.submitted_at is not null then return jsonb_build_object('application',recruitment_application_json(p_id));end if;
 if a.status not in ('draft','incomplete') then raise exception 'immutable: Esta postulación ya no puede enviarse.';end if;
 foreach field in array array['firstName','lastName','email','phone','university','faculty','career','admissionTerm','semester','firstChoiceArea','motivation','shortCase'] loop
   if length(trim(coalesce(a.data->>field,'')))=0 then raise exception 'incomplete: Completa todos los campos obligatorios.';end if;
 end loop;
 if not coalesce((a.data->>'consent')::boolean,false) or a.video is null then raise exception 'incomplete: Se requiere consentimiento y un video validado.';end if;
 if a.data->>'availabilityHours' is null or (a.data->>'availabilityHours')::numeric<(c->>'minAvailabilityHours')::numeric then raise exception 'availability: No se cumple la disponibilidad mínima configurada.';end if;
 select value into area from jsonb_array_elements(c->'areas') where value->>'id'=a.data->>'firstChoiceArea' and (value->>'enabled')::boolean;
 if not found then raise exception 'invalid_area: El área elegida no está habilitada.';end if;
 if coalesce(a.data->>'secondChoiceArea','')<>'' and not exists(select 1 from jsonb_array_elements(c->'areas') where value->>'id'=a.data->>'secondChoiceArea' and (value->>'enabled')::boolean) then raise exception 'invalid_area: La segunda área no está habilitada.';end if;
 if (select count(*) from recruitment_applications where submitted_at is not null)>=(c->>'maxApplicants')::integer then raise exception 'capacity: Se alcanzó el máximo de 150 postulaciones.';end if;
 update recruitment_applications set status='submitted',submitted_at=now(),updated_at=now() where id=p_id;
 insert into recruitment_events(application_id,from_status,to_status,actor,reason) values(p_id,a.status,'submitted','postulante','Datos completos y video verificado; postulación confirmada.');
 perform recruitment_enqueue(p_id,'submitted');
 return jsonb_build_object('application',recruitment_application_json(p_id));
end $$;
create function public.recruitment_admin_config() returns jsonb language sql set search_path=public as $$ select jsonb_build_object('config',settings||jsonb_build_object('revision',revision)) from recruitment_config $$;
create function public.recruitment_update_config(p_config jsonb,p_actor text) returns jsonb language plpgsql set search_path=public as $$
declare c recruitment_config;
begin
 select * into c from recruitment_config for update;
 if (p_config->>'revision')::integer<>c.revision then raise exception 'revision_conflict: Otra sesión modificó la configuración. Recarga antes de guardar.';end if;
 if (p_config->>'maxApplicants')::integer not between 1 and 150 or (p_config->>'maxVideoSeconds')::integer<>60 or (p_config->>'questionsPerCategory')::integer<>2 then raise exception 'configuration: El máximo es 150 postulantes, 60 segundos y 2 preguntas por categoría.';end if;
 if (p_config->>'maxVideoBytes')::bigint not between 1048576 and 20971520 then raise exception 'configuration: El tamaño máximo de cada video debe estar entre 1 y 20 MiB.';end if;
 if (p_config->>'enabled')::boolean and (p_config->>'opensAt' is null or p_config->>'closesAt' is null or p_config->>'minAvailabilityHours' is null) then raise exception 'configuration: Define fechas y disponibilidad mínima antes de abrir.';end if;
 insert into recruitment_config_events(actor,kind,before_value,after_value) values(p_actor,'configuration',c.settings,p_config-'revision');
 update recruitment_config set settings=p_config-'revision',revision=revision+1,updated_at=now();
 return recruitment_admin_config();
end $$;
create function public.recruitment_admin_applications(p_id uuid default null) returns jsonb language sql set search_path=public as $$
 select case when p_id is null then jsonb_build_object('applications',coalesce(jsonb_agg(recruitment_application_json(a.id,true) order by a.created_at desc),'[]'::jsonb))
 else jsonb_build_object('application',recruitment_application_json(p_id,true)) end from recruitment_applications a where p_id is null or a.id=p_id
$$;
create function public.recruitment_transition(p_id uuid,p_status text,p_reason text,p_actor text) returns jsonb language plpgsql set search_path=public as $$
declare a recruitment_applications; allowed jsonb:='{
 "draft":["withdrawn"],"incomplete":["withdrawn"],"expired":[],
 "submitted":["profile_validated","profile_rejected","withdrawn"],
 "profile_validated":["test_sent","discarded","withdrawn"],"profile_rejected":[],
 "test_sent":["test_completed","discarded","withdrawn"],
 "test_completed":["awaiting_second_review","interview_eligible","interview_ineligible","discarded","withdrawn"],
 "awaiting_second_review":["interview_eligible","interview_ineligible","discarded","withdrawn"],
 "interview_eligible":["interview_scheduled","discarded","withdrawn"],"interview_ineligible":[],
 "interview_scheduled":["interviewed","discarded","withdrawn"],"interviewed":["group_eligible","discarded","withdrawn"],
 "group_eligible":["group_scheduled","discarded","withdrawn"],"group_scheduled":["group_completed","discarded","withdrawn"],
 "group_completed":["selected","conditional_selected","waitlisted","not_selected","withdrawn"],
 "selected":["onboarding_sent","withdrawn"],"conditional_selected":["selected","onboarding_sent","withdrawn"],
 "waitlisted":["selected","conditional_selected","not_selected","withdrawn"],"not_selected":[],
 "onboarding_sent":["buddy_assigned","withdrawn"],"buddy_assigned":["integrated","withdrawn"],"integrated":[],"discarded":[],"withdrawn":[]
 }'::jsonb;
begin
 select * into a from recruitment_applications where id=p_id for update;
 if not found then raise exception 'not_found: No existe esa postulación.';end if;
 if length(trim(p_reason))<3 then raise exception 'reason_required: Registra el motivo de la transición.';end if;
 if p_status=a.status then return jsonb_build_object('application',recruitment_application_json(p_id,true));end if;
 if not coalesce((allowed->a.status)?p_status,false) then raise exception 'invalid_transition: No se permite retroceder, saltar etapas o modificar un resultado final.';end if;
 update recruitment_applications set status=p_status,updated_at=now() where id=p_id;
 insert into recruitment_events(application_id,from_status,to_status,actor,reason) values(p_id,a.status,p_status,p_actor,left(p_reason,2000));
 perform recruitment_enqueue(p_id,p_status);
 return jsonb_build_object('application',recruitment_application_json(p_id,true));
end $$;
create function public.recruitment_templates(p_templates jsonb default null,p_actor text default null) returns jsonb language plpgsql set search_path=public as $$
declare item jsonb; before_templates jsonb;
begin
 if p_templates is not null then
  select jsonb_agg(to_jsonb(t)) into before_templates from recruitment_email_templates t;
  for item in select value from jsonb_array_elements(p_templates) loop
   update recruitment_email_templates set subject=item->>'subject',body=item->>'body',enabled=(item->>'enabled')::boolean,updated_at=now() where key=item->>'key';
   if not found then raise exception 'invalid_template: Plantilla desconocida.';end if;
  end loop;
  insert into recruitment_config_events(actor,kind,before_value,after_value) values(p_actor,'templates',before_templates,p_templates);
 end if;
 return jsonb_build_object('templates',(select jsonb_agg(jsonb_build_object('key',key,'subject',subject,'body',body,'enabled',enabled) order by key) from recruitment_email_templates),'allowedTemplateVariables',jsonb_build_array('firstName','lastName','title','status','resumeUrl'));
end $$;
create function public.recruitment_queue() returns jsonb language sql set search_path=public as $$
 select jsonb_build_object('queue',coalesce(jsonb_agg(jsonb_build_object('id',id,'applicationId',application_id,'templateKey',template_key,'status',status,'attempts',attempts,'nextAttemptAt',next_attempt_at,'lastError',last_error,'createdAt',created_at,'sentAt',sent_at) order by created_at desc),'[]'::jsonb)) from recruitment_email_outbox
$$;
create function public.recruitment_lease_emails(p_limit integer,p_lease_token uuid) returns jsonb language plpgsql set search_path=public as $$
declare items jsonb;
begin
 update recruitment_email_outbox set status='failed',lease_token=null,leased_until=null,last_error='La reserva del último intento venció sin confirmación del proveedor.' where status='leased' and leased_until<now() and attempts>=5;
 with due as (select id from recruitment_email_outbox where (status='pending' or (status='leased' and leased_until<now())) and next_attempt_at<=now() and attempts<5 order by created_at for update skip locked limit least(greatest(p_limit,1),20)),
 leased as (update recruitment_email_outbox o set status='leased',lease_token=p_lease_token,leased_until=now()+interval '5 minutes',attempts=attempts+1 from due where o.id=due.id returning o.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'applicationId',application_id,'templateKey',template_key,'to',recipient,'subject',subject,'body',body,'payload',payload,'attempts',attempts,'leaseToken',lease_token)),'[]'::jsonb) into items from leased;
 return jsonb_build_object('items',items);
end $$;
create function public.recruitment_finish_email(p_id uuid,p_lease_token uuid,p_message_id text,p_error text) returns void language plpgsql set search_path=public as $$
begin
 if p_error is null and nullif(p_message_id,'') is null then raise exception 'invalid_delivery: El proveedor no confirmó el envío.';end if;
 update recruitment_email_outbox set status=case when p_error is null then 'sent' when attempts>=5 then 'failed' else 'pending' end,
 provider_message_id=case when p_error is null then p_message_id else provider_message_id end,
 sent_at=case when p_error is null then now() else sent_at end,last_error=left(p_error,500),
 next_attempt_at=now()+make_interval(secs=>least(3600,(30*power(2,attempts))::integer)),leased_until=null,lease_token=null
 where id=p_id and status='leased' and lease_token=p_lease_token;
 if not found then raise exception 'lease_lost: Esta entrega ya no posee la reserva de la cola.';end if;
end $$;
create function public.recruitment_expire_drafts() returns integer language plpgsql set search_path=public as $$
declare c jsonb; changed integer:=0; item record; resume_secret jsonb;
begin
 select settings into c from recruitment_config for update;
 for item in select id,status from recruitment_applications where status in ('draft','incomplete') and
 ((c->>'closesAt' is not null and now()>coalesce((c->>'extensionAt')::timestamptz,(c->>'closesAt')::timestamptz)) or
 (status='draft' and updated_at<now()-make_interval(hours=>(c->>'inactivityHours')::integer))) for update loop
   update recruitment_applications set status=case when c->>'closesAt' is not null and now()>coalesce((c->>'extensionAt')::timestamptz,(c->>'closesAt')::timestamptz) then 'expired' else 'incomplete' end,updated_at=now() where id=item.id;
   insert into recruitment_events(application_id,from_status,to_status,actor,reason) select id,item.status,status,'sistema','Plazo de convocatoria vencido o borrador inactivo.' from recruitment_applications where id=item.id;
   select jsonb_build_object('resumeSecret',payload->>'resumeSecret') into resume_secret from recruitment_email_outbox where application_id=item.id and template_key='resume';
   perform recruitment_enqueue(item.id,(select status from recruitment_applications where id=item.id),coalesce(resume_secret,'{}'::jsonb));
   changed:=changed+1;
 end loop;
 return changed;
end $$;

-- Defense in depth: no applicant/browser role can read or mutate recruitment tables.
alter table public.recruitment_config enable row level security;
alter table public.recruitment_applications enable row level security;
alter table public.recruitment_events enable row level security;
alter table public.recruitment_technical_failures enable row level security;
alter table public.recruitment_uploads enable row level security;
alter table public.recruitment_email_templates enable row level security;
alter table public.recruitment_email_outbox enable row level security;
alter table public.recruitment_rate_limits enable row level security;
alter table public.recruitment_config_events enable row level security;
do $$ declare item record;begin
 for item in select tablename from pg_tables where schemaname='public' and tablename like 'recruitment_%' loop
  execute format('revoke all on table public.%I from public',item.tablename);
  if exists(select 1 from pg_roles where rolname='anon') then execute format('revoke all on table public.%I from anon',item.tablename);end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then execute format('revoke all on table public.%I from authenticated',item.tablename);end if;
  if exists(select 1 from pg_roles where rolname='service_role') then execute format('grant all on table public.%I to service_role',item.tablename);end if;
 end loop;
 for item in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname like 'recruitment_%' loop
  execute format('revoke all on function %s from public',item.signature);
  if exists(select 1 from pg_roles where rolname='anon') then execute format('revoke all on function %s from anon',item.signature);end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then execute format('revoke all on function %s from authenticated',item.signature);end if;
  if exists(select 1 from pg_roles where rolname='service_role') then execute format('grant execute on function %s to service_role',item.signature);end if;
 end loop;
end $$;
