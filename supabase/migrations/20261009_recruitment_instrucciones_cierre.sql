-- Video of up to 3 min 30 s (introduction, the 4 questions and a closing line) and a closing
-- form after the video: something they made, other organizations, and how they heard of the call.
-- Applications already submitted are not affected. Run once after 20261008.

create or replace function public.recruitment_submit(p_id uuid,p_token_hash text) returns jsonb language plpgsql set search_path=public as $$
declare a recruitment_applications; c jsonb; area jsonb; field text;
begin
 c:=recruitment_assert_open();a:=recruitment_require_owner(p_id,p_token_hash);
 if a.submitted_at is not null then return jsonb_build_object('application',recruitment_application_json(p_id));end if;
 if a.status not in ('draft','incomplete') then raise exception 'immutable: Esta postulación ya no puede enviarse.';end if;
 foreach field in array array['firstName','lastName','email','phone','university','career','admissionTerm','semester','firstChoiceArea','motivation','showcase','organizations','referralSource'] loop
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

create or replace function public.recruitment_update_config(p_config jsonb,p_actor text) returns jsonb language plpgsql set search_path=public as $$
declare c recruitment_config;
begin
 select * into c from recruitment_config where singleton for update;
 if (p_config->>'revision')::integer<>c.revision then raise exception 'revision_conflict: Otra sesión modificó la configuración. Recarga antes de guardar.';end if;
 if (p_config->>'maxApplicants')::integer not between 1 and 150 or (p_config->>'maxVideoSeconds')::integer<>210 or (p_config->>'questionsPerCategory')::integer<>2 then raise exception 'configuration: El máximo es 150 postulantes, 3 min 30 s de video y 2 preguntas por categoría.';end if;
 if (p_config->>'maxVideoBytes')::bigint not between 1048576 and 52428800 then raise exception 'configuration: El tamaño máximo de cada video debe estar entre 1 y 50 MiB.';end if;
 if (p_config->>'enabled')::boolean and (p_config->>'opensAt' is null or p_config->>'closesAt' is null or p_config->>'minAvailabilityHours' is null) then raise exception 'configuration: Define fechas antes de abrir.';end if;
 insert into recruitment_config_events(actor,kind,before_value,after_value) values(p_actor,'configuration',c.settings-'previewKeyHash',p_config-'revision');
 update recruitment_config set settings=(p_config-'revision'-'previewKeyHash')||case when c.settings ? 'previewKeyHash' then jsonb_build_object('previewKeyHash',c.settings->'previewKeyHash') else '{}'::jsonb end,revision=revision+1,updated_at=now() where singleton;
 return jsonb_build_object('config',(select (settings-'previewKeyHash')||jsonb_build_object('revision',revision) from recruitment_config));
end $$;

-- At the recorder's 1.2 Mbps, 3 min 30 s is about 33 MB: allow up to 50 MB.
update public.recruitment_config
 set settings=settings||'{"maxVideoSeconds":210,"maxVideoBytes":52428800}'::jsonb,revision=revision+1,updated_at=now()
 where singleton;

revoke all on function public.recruitment_submit(uuid,text) from public, anon, authenticated;
revoke all on function public.recruitment_update_config(jsonb,text) from public, anon, authenticated;
grant execute on function public.recruitment_submit(uuid,text) to service_role;
grant execute on function public.recruitment_update_config(jsonb,text) to service_role;
