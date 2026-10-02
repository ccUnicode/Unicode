-- Supabase's safeupdate extension rejects UPDATE without WHERE on API requests,
-- so saving the configuration and generating the test link failed in production.
create or replace function public.recruitment_update_config(p_config jsonb,p_actor text) returns jsonb language plpgsql set search_path=public as $$
declare c recruitment_config;
begin
 select * into c from recruitment_config where singleton for update;
 if (p_config->>'revision')::integer<>c.revision then raise exception 'revision_conflict: Otra sesión modificó la configuración. Recarga antes de guardar.';end if;
 if (p_config->>'maxApplicants')::integer not between 1 and 150 or (p_config->>'maxVideoSeconds')::integer<>60 or (p_config->>'questionsPerCategory')::integer<>2 then raise exception 'configuration: El máximo es 150 postulantes, 60 segundos y 2 preguntas por categoría.';end if;
 if (p_config->>'maxVideoBytes')::bigint not between 1048576 and 20971520 then raise exception 'configuration: El tamaño máximo de cada video debe estar entre 1 y 20 MiB.';end if;
 if (p_config->>'enabled')::boolean and (p_config->>'opensAt' is null or p_config->>'closesAt' is null or p_config->>'minAvailabilityHours' is null) then raise exception 'configuration: Define fechas antes de abrir.';end if;
 insert into recruitment_config_events(actor,kind,before_value,after_value) values(p_actor,'configuration',c.settings-'previewKeyHash',p_config-'revision');
 update recruitment_config set settings=(p_config-'revision'-'previewKeyHash')||case when c.settings ? 'previewKeyHash' then jsonb_build_object('previewKeyHash',c.settings->'previewKeyHash') else '{}'::jsonb end,revision=revision+1,updated_at=now() where singleton;
 return jsonb_build_object('config',(select (settings-'previewKeyHash')||jsonb_build_object('revision',revision) from recruitment_config));
end $$;

create or replace function public.recruitment_set_preview_key(p_hash text,p_actor text) returns jsonb language plpgsql set search_path=public as $$
begin
 if p_hash is not null and p_hash !~ '^[0-9a-f]{64}$' then raise exception 'configuration: Clave de prueba inválida.';end if;
 update recruitment_config set settings=case when p_hash is null then settings-'previewKeyHash' else settings||jsonb_build_object('previewKeyHash',p_hash) end,updated_at=now() where singleton;
 insert into recruitment_config_events(actor,kind,before_value,after_value) values(p_actor,'preview',null,jsonb_build_object('enabled',p_hash is not null));
 return jsonb_build_object('previewEnabled',p_hash is not null);
end $$;

revoke all on function public.recruitment_update_config(jsonb,text) from public, anon, authenticated;
revoke all on function public.recruitment_set_preview_key(text,text) from public, anon, authenticated;
grant execute on function public.recruitment_update_config(jsonb,text) to service_role;
grant execute on function public.recruitment_set_preview_key(text,text) to service_role;
