-- Faculty becomes optional: institutes usually have none. Run once; safe with the old and new form.
create or replace function public.recruitment_submit(p_id uuid,p_token_hash text) returns jsonb language plpgsql set search_path=public as $$
declare a recruitment_applications; c jsonb; area jsonb; field text;
begin
 c:=recruitment_assert_open();a:=recruitment_require_owner(p_id,p_token_hash);
 if a.submitted_at is not null then return jsonb_build_object('application',recruitment_application_json(p_id));end if;
 if a.status not in ('draft','incomplete') then raise exception 'immutable: Esta postulación ya no puede enviarse.';end if;
 foreach field in array array['firstName','lastName','email','phone','university','career','admissionTerm','semester','firstChoiceArea','motivation'] loop
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
revoke all on function public.recruitment_submit(uuid,text) from public, anon, authenticated;
grant execute on function public.recruitment_submit(uuid,text) to service_role;
