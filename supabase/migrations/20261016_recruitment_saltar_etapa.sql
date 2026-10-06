-- Permite definir la decisión directamente sin pasar obligatoriamente por una 2.ª etapa.
-- Cada director decide sobre los postulantes de su área; GTH y administración sobre todas.

create or replace function public.recruitment_transition(p_id uuid,p_status text,p_reason text,p_actor text) returns jsonb language plpgsql set search_path=public as $$
declare a recruitment_applications; allowed jsonb:='{
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
