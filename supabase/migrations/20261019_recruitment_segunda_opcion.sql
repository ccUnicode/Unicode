-- Per-area evaluation closure and one automatic handoff to the applicant's second choice.
-- Registration dates remain independent of evaluation closure. Apply before deploying the API.
begin;
alter table public.recruitment_applications add column evaluation_choice integer not null default 1 check(evaluation_choice in (1,2));
alter table public.recruitment_applications add column second_option_at timestamptz;
create table public.recruitment_area_evaluation (
 area text primary key check(area in ('ID','RRPP','GTH','ACD','DCC','LGE','FIN')),
 closed boolean not null default false, updated_at timestamptz not null default now(), actor text not null default 'migración'
);
insert into public.recruitment_area_evaluation(area) select unnest(array['ID','RRPP','GTH','ACD','DCC','LGE','FIN']);
alter table public.recruitment_area_evaluation enable row level security;
revoke all on public.recruitment_area_evaluation from public,anon,authenticated;
grant all on public.recruitment_area_evaluation to service_role;

create function public.recruitment_area_evaluation(p_area text default null,p_closed boolean default null,p_actor text default null) returns jsonb language plpgsql set search_path=public as $$
begin
 if p_closed is not null then
   -- Same lock as handoff: a transfer cannot race the area's closure or a config save.
   perform 1 from recruitment_config where singleton for update;
   if not exists(select 1 from recruitment_area_evaluation where area=p_area) then raise exception 'invalid_area: Área desconocida.';end if;
   insert into recruitment_config_events(actor,kind,before_value,after_value)
    select p_actor,'area_evaluation',jsonb_build_object('area',area,'closed',closed),jsonb_build_object('area',area,'closed',p_closed)
    from recruitment_area_evaluation where area=p_area and closed<>p_closed;
   update recruitment_area_evaluation set closed=p_closed,actor=p_actor,updated_at=now() where area=p_area and closed<>p_closed;
 end if;
 return jsonb_build_object('areas',(select jsonb_agg(jsonb_build_object('area',area,'closed',closed) order by area) from recruitment_area_evaluation));
end $$;

create or replace function public.recruitment_application_json(p_id uuid,p_history boolean default false)
returns jsonb language sql set search_path=public as $$
 select jsonb_build_object('id',a.id,'data',a.data,
 'questions',case when p_history or a.video is not null or a.recording_attempts>a.technical_failure_count then a.questions else '[]'::jsonb end,
 'status',a.status,'video',a.video,'evaluationChoice',a.evaluation_choice,
 'evaluationArea',case when a.evaluation_choice=2 then a.data->>'secondChoiceArea' else a.data->>'firstChoiceArea' end,
 'secondOptionAt',a.second_option_at,
 'technicalFailureCount',a.technical_failure_count,'recordingAttempts',a.recording_attempts,
 'alternateAllowed',false,'remindersOff',a.reminders_off,'lastReminderAt',a.last_reminder_at,
 'isTest',a.is_test,'createdAt',a.created_at,'updatedAt',a.updated_at,'submittedAt',a.submitted_at) ||
 case when p_history then jsonb_build_object('history',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'fromStatus',e.from_status,'toStatus',e.to_status,'actor',e.actor,'reason',e.reason,'createdAt',e.created_at) order by e.created_at) from recruitment_events e where e.application_id=a.id),'[]'::jsonb)) else '{}'::jsonb end
 from recruitment_applications a where a.id=p_id
$$;

-- A six/seven argument contract preserves SQL callers with four arguments, but API callers always
-- submit the snapshot and actor's scope. Ownership and stale-click checks run under the row lock.
drop function public.recruitment_transition(uuid,text,text,text);
create function public.recruitment_transition(p_id uuid,p_status text,p_reason text,p_actor text,
 p_expected_status text default null,p_expected_choice integer default null,p_scope_area text default null)
returns jsonb language plpgsql set search_path=public as $$
declare a recruitment_applications; c jsonb; destination text; target text:=p_status; mail_key text:=p_status;
 current_area text; first_area_name text; area_name text; destination_name text; transferred boolean:=false;
 allowed jsonb:='{
 "draft":["withdrawn"],"incomplete":["withdrawn"],"expired":[],
 "submitted":["profile_validated","profile_rejected","selected","not_selected","withdrawn"],
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
 current_area:=case when a.evaluation_choice=2 then a.data->>'secondChoiceArea' else a.data->>'firstChoiceArea' end;
 if p_scope_area is not null and current_area<>p_scope_area then raise exception 'forbidden: Esta postulación está siendo evaluada por otra área.';end if;
 if p_expected_status is not null and (a.status<>p_expected_status or a.evaluation_choice is distinct from p_expected_choice) then
  raise exception 'revision_conflict: La evaluación cambió. Actualiza la ficha antes de decidir.';
 end if;
 if length(trim(p_reason))<3 then raise exception 'reason_required: Registra el motivo de la transición.';end if;
 if p_status=a.status then return jsonb_build_object('application',recruitment_application_json(p_id,true),'transferred',false);end if;
 if not coalesce((allowed->a.status)?p_status,false) then raise exception 'invalid_transition: Ese resultado no corresponde a la etapa actual o ya fue enviado.';end if;
 select settings into c from recruitment_config where singleton for update;
 select ar->>'name' into area_name from jsonb_array_elements(c->'areas') ar where ar->>'id'=current_area;
 select ar->>'name' into first_area_name from jsonb_array_elements(c->'areas') ar where ar->>'id'=a.data->>'firstChoiceArea';
 destination:=nullif(a.data->>'secondChoiceArea','');
 select ar->>'name' into destination_name from jsonb_array_elements(c->'areas') ar where ar->>'id'=destination;
 if p_status in ('profile_rejected','not_selected') then
  if a.evaluation_choice=1 and destination is not null and destination<>current_area
   and exists(select 1 from jsonb_array_elements(c->'areas') ar where ar->>'id'=destination and coalesce((ar->>'enabled')::boolean,false))
   and exists(select 1 from recruitment_area_evaluation where area=destination and not closed) then
    target:='submitted'; mail_key:='second_option'; transferred:=true;
    select ar->>'name' into destination_name from jsonb_array_elements(c->'areas') ar where ar->>'id'=destination;
    update recruitment_applications set evaluation_choice=2,second_option_at=now() where id=p_id;
  else
    -- One final rejection email, regardless of which evaluation stage rejected the applicant.
    mail_key:='not_selected';
  end if;
 elsif p_status='profile_validated' and a.evaluation_choice=2 then mail_key:='second_profile_validated';
 end if;
 update recruitment_applications set status=target,updated_at=now() where id=p_id;
 insert into recruitment_events(application_id,from_status,to_status,actor,reason)
 values(p_id,a.status,target,p_actor,left(case when transferred then
  'Pase de primera opción ('||current_area||') a segunda opción ('||destination||'). ' else '' end||p_reason,2000));
 perform recruitment_enqueue(p_id,mail_key,jsonb_build_object('evaluationArea',coalesce(case when transferred then destination_name else area_name end,current_area),'firstArea',coalesce(first_area_name,a.data->>'firstChoiceArea'),'secondArea',coalesce(destination_name,destination,'')));
 return jsonb_build_object('application',recruitment_application_json(p_id,true),'transferred',transferred);
end $$;

insert into recruitment_email_templates(key,subject,body,enabled) values
 ('second_option','Tu postulación sigue en evaluación en {{secondArea}}',
 E'Hola {{firstName}},\n\nGracias por el tiempo, las ideas y las ganas que compartiste con UNICODE. Después de revisar tu postulación en {{firstArea}}, queremos seguir conociéndote desde {{secondArea}}, el área que elegiste como segunda opción.\n\nTu postulación sigue activa y pasará a la evaluación de ese equipo. No necesitas volver a inscribirte ni grabar otro video: conservamos lo que ya nos compartiste. Este pase todavía no significa una selección; te escribiremos cuando tengamos el siguiente resultado.\n\nGracias por seguir en este proceso con nosotros.\nUn abrazo,\nEl equipo de UNICODE',true),
 ('second_profile_validated','Un nuevo paso en tu postulación a {{evaluationArea}}',
 E'Hola {{firstName}},\n\n¡Tenemos una buena noticia! El equipo de {{evaluationArea}} revisó tu perfil y quiere continuar contigo en la siguiente etapa. Nos alegra seguir conociendo tus ideas y lo que te gustaría aportar.\n\nPronto te escribiremos con los siguientes pasos. Gracias por tu paciencia y por las ganas de formar parte de UNICODE.\n\nUn abrazo,\nEl equipo de UNICODE',true);
-- Preserve customized selection messages; update the default final rejection to fit any stage.
update recruitment_email_templates set subject='Gracias por compartir este proceso con UNICODE',
 body=E'Hola {{firstName}},\n\nGracias por abrirnos un espacio para conocerte y por el tiempo y el entusiasmo que pusiste en tu postulación. Hemos terminado la evaluación y, en esta convocatoria, no podremos ofrecerte un lugar en el equipo.\n\nSabemos que este no es el resultado que esperabas. Valoramos lo que compartiste con nosotros; esta decisión corresponde a las necesidades de las áreas en este momento y no define todo lo que puedes aportar.\n\nNos encantará volver a encontrarnos en las actividades de la comunidad o en una próxima convocatoria, si te animas a participar. Gracias por considerar a UNICODE como parte de tu camino.\n\nCon cariño,\nEl equipo de UNICODE',updated_at=now()
 where key='not_selected' and body in (
 'Hola {{firstName}}, gracias por llegar hasta la segunda etapa. Esta vez no ingresas a UNICODE, pero valoramos mucho tu participación y te animamos a postular en una próxima convocatoria.'
 );
create or replace function public.recruitment_templates(p_templates jsonb default null,p_actor text default null) returns jsonb language plpgsql set search_path=public as $$
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
 return jsonb_build_object('templates',(select jsonb_agg(jsonb_build_object('key',key,'subject',subject,'body',body,'enabled',enabled) order by key) from recruitment_email_templates),'allowedTemplateVariables',jsonb_build_array('firstName','lastName','title','status','resumeUrl','evaluationArea','firstArea','secondArea'));
end $$;

revoke all on function public.recruitment_area_evaluation(text,boolean,text) from public,anon,authenticated;
revoke all on function public.recruitment_transition(uuid,text,text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.recruitment_area_evaluation(text,boolean,text) to service_role;
grant execute on function public.recruitment_transition(uuid,text,text,text,text,integer,text) to service_role;
notify pgrst,'reload schema';
commit;
