-- No cap on the number of applicants (the 150 was only an estimate for storage), and GTH can
-- delete an application, e.g. a test sent as if it were real. Run once.

create or replace function public.recruitment_update_config(p_config jsonb,p_actor text) returns jsonb language plpgsql set search_path=public as $$
declare c recruitment_config;
begin
 select * into c from recruitment_config where singleton for update;
 if (p_config->>'revision')::integer<>c.revision then raise exception 'revision_conflict: Otra sesión modificó la configuración. Recarga antes de guardar.';end if;
 if (p_config->>'maxApplicants')::integer not between 1 and 1000000 or (p_config->>'maxVideoSeconds')::integer<>210 or (p_config->>'questionsPerCategory')::integer<>2 then raise exception 'configuration: El video dura hasta 3 min 30 s y 2 preguntas por categoría.';end if;
 if (p_config->>'maxVideoBytes')::bigint not between 1048576 and 52428800 then raise exception 'configuration: El tamaño máximo de cada video debe estar entre 1 y 50 MiB.';end if;
 if (p_config->>'enabled')::boolean and (p_config->>'opensAt' is null or p_config->>'closesAt' is null or p_config->>'minAvailabilityHours' is null) then raise exception 'configuration: Define fechas antes de abrir.';end if;
 insert into recruitment_config_events(actor,kind,before_value,after_value) values(p_actor,'configuration',c.settings-'previewKeyHash',p_config-'revision');
 update recruitment_config set settings=(p_config-'revision'-'previewKeyHash')||case when c.settings ? 'previewKeyHash' then jsonb_build_object('previewKeyHash',c.settings->'previewKeyHash') else '{}'::jsonb end,revision=revision+1,updated_at=now() where singleton;
 return jsonb_build_object('config',(select (settings-'previewKeyHash')||jsonb_build_object('revision',revision) from recruitment_config));
end $$;

update public.recruitment_config set settings=settings||'{"maxApplicants":1000000}'::jsonb,revision=revision+1,updated_at=now() where singleton;

-- Deletes one application with its history, queued emails and uploads; returns the stored
-- files so the server can remove them from storage. The deletion itself is recorded.
create or replace function public.recruitment_admin_delete(p_id uuid,p_actor text) returns jsonb language plpgsql set search_path=public as $$
declare a recruitment_applications; files jsonb;
begin
 select * into a from recruitment_applications where id=p_id for update;
 if not found then raise exception 'not_found: Esa postulación ya no existe.'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('applicationId',u.application_id,'uploadId',u.id,'provider',u.provider,'fileId',u.file_id)) filter (where u.file_id is not null),'[]'::jsonb) into files from recruitment_uploads u where u.application_id=p_id;
 delete from recruitment_email_outbox where application_id=p_id;
 delete from recruitment_events where application_id=p_id;
 delete from recruitment_technical_failures where application_id=p_id;
 delete from recruitment_uploads where application_id=p_id;
 delete from recruitment_applications where id=p_id;
 insert into recruitment_config_events(actor,kind,before_value,after_value) values(coalesce(p_actor,'administracion'),'application_deleted',jsonb_build_object('id',a.id,'name',trim(coalesce(a.data->>'firstName','')||' '||coalesce(a.data->>'lastName','')),'status',a.status),null);
 return jsonb_build_object('deleted',true,'files',files);
end $$;

revoke all on function public.recruitment_update_config(jsonb,text) from public, anon, authenticated;
revoke all on function public.recruitment_admin_delete(uuid,text) from public, anon, authenticated;
grant execute on function public.recruitment_update_config(jsonb,text) to service_role;
grant execute on function public.recruitment_admin_delete(uuid,text) to service_role;
