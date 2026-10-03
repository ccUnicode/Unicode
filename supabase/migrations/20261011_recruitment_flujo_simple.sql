-- Simplified process: complete registration (automatic) → first stage, the profile advances or
-- not → second stage, joins or not. GTH sends each result with a button. The other stage emails are
-- disabled; the personal link, the reminder to finish and these four results remain.
-- Run once.

create or replace function public.recruitment_transition(p_id uuid,p_status text,p_reason text,p_actor text) returns jsonb language plpgsql set search_path=public as $$
declare a recruitment_applications; allowed jsonb:='{
 "draft":["withdrawn"],"incomplete":["withdrawn"],"expired":[],
 "submitted":["profile_validated","profile_rejected","withdrawn"],
 "profile_validated":["selected","not_selected","withdrawn"],
 "profile_rejected":[],"selected":[],"not_selected":[],"withdrawn":[],"discarded":[],
 "test_sent":["selected","not_selected","withdrawn"],"test_completed":["selected","not_selected","withdrawn"],
 "awaiting_second_review":["selected","not_selected","withdrawn"],"interview_eligible":["selected","not_selected","withdrawn"],
 "interview_scheduled":["selected","not_selected","withdrawn"],"interviewed":["selected","not_selected","withdrawn"],
 "group_eligible":["selected","not_selected","withdrawn"],"group_scheduled":["selected","not_selected","withdrawn"],
 "group_completed":["selected","not_selected","withdrawn"],"interview_ineligible":[],
 "conditional_selected":[],"waitlisted":["selected","not_selected","withdrawn"],
 "onboarding_sent":[],"buddy_assigned":[],"integrated":[]
 }'::jsonb;
begin
 select * into a from recruitment_applications where id=p_id for update;
 if not found then raise exception 'not_found: No existe esa postulación.';end if;
 if length(trim(p_reason))<3 then raise exception 'reason_required: Registra el motivo de la transición.';end if;
 if p_status=a.status then return jsonb_build_object('application',recruitment_application_json(p_id,true));end if;
 if not coalesce((allowed->a.status)?p_status,false) then raise exception 'invalid_transition: Ese resultado no corresponde a la etapa actual o ya fue enviado.';end if;
 update recruitment_applications set status=p_status,updated_at=now() where id=p_id;
 insert into recruitment_events(application_id,from_status,to_status,actor,reason) values(p_id,a.status,p_status,p_actor,left(p_reason,2000));
 perform recruitment_enqueue(p_id,p_status);
 return jsonb_build_object('application',recruitment_application_json(p_id,true));
end $$;
revoke all on function public.recruitment_transition(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.recruitment_transition(uuid,text,text,text) to service_role;

update public.recruitment_email_templates set enabled=false,updated_at=now()
 where key not in ('resume','incomplete','submitted','profile_validated','profile_rejected','selected','not_selected');

update public.recruitment_email_templates as t set subject=v.subject,body=v.body,enabled=true,updated_at=now()
from (values
 ('incomplete','Te falta completar tu postulación a {{title}}',
  'Hola {{firstName}}, tu postulación aún no está completa: falta grabar tu video o enviar tus respuestas finales. Retómala con tu enlace personal, que guarda todo lo que avanzaste: {{resumeUrl}}. Tienes hasta el cierre de la convocatoria.'),
 ('submitted','Tu inscripción a {{title}} está completa',
  'Hola {{firstName}}, recibimos tus datos, tu video y tus respuestas: tu inscripción está completa. Revisaremos tu perfil y te escribiremos con el resultado de la primera etapa.'),
 ('profile_validated','Avanzas a la segunda etapa de {{title}}',
  'Hola {{firstName}}, revisamos tu perfil y avanzas a la segunda etapa. Muy pronto te escribiremos con los siguientes pasos.'),
 ('profile_rejected','Resultado de la primera etapa de {{title}}',
  'Hola {{firstName}}, gracias por postular y por el tiempo que le dedicaste. Revisamos tu perfil y esta vez no avanzas a la segunda etapa. Nos encantaría verte en una próxima convocatoria.'),
 ('selected','Ingresas a UNICODE',
  'Hola {{firstName}}, ¡felicitaciones! Terminamos la segunda etapa y ingresas a UNICODE. En los próximos días te escribiremos para darte la bienvenida y contarte cómo empezar.'),
 ('not_selected','Resultado final de {{title}}',
  'Hola {{firstName}}, gracias por llegar hasta la segunda etapa. Esta vez no ingresas a UNICODE, pero valoramos mucho tu participación y te animamos a postular en una próxima convocatoria.')
) as v(key,subject,body)
where t.key=v.key;
