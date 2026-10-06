-- Prórroga de convocatoria: reactivación automática de borradores vencidos
-- y cancelación estricta de envíos de correo una vez cerrada la convocatoria. Run once.

create or replace function public.recruitment_reactivate_expired_drafts()
returns integer language plpgsql set search_path=public as $$
declare
  c jsonb;
  call_open boolean;
  reactivated integer := 0;
  item record;
begin
  select settings into c from recruitment_config for update;
  call_open := coalesce((c->>'enabled')::boolean, false)
    and c->>'opensAt' is not null and now() >= (c->>'opensAt')::timestamptz
    and (c->>'closesAt' is null or now() <= coalesce((c->>'extensionAt')::timestamptz, (c->>'closesAt')::timestamptz));

  if call_open then
    for item in select id from recruitment_applications where status = 'expired' and submitted_at is null for update loop
      update recruitment_applications set status = 'incomplete', updated_at = now() where id = item.id;
      insert into recruitment_events(application_id, from_status, to_status, actor, reason)
      values(item.id, 'expired', 'incomplete', 'sistema', 'Plazo ampliado: borrador reactivado.');
      reactivated := reactivated + 1;
    end loop;
  end if;

  return reactivated;
end $$;

create or replace function public.recruitment_update_config(p_config jsonb, p_actor text)
returns jsonb language plpgsql set search_path=public as $$
declare c recruitment_config;
begin
  select * into c from recruitment_config where singleton for update;
  if (p_config->>'revision')::integer <> c.revision then raise exception 'revision_conflict: Otra sesión modificó la configuración. Recarga antes de guardar.'; end if;
  if (p_config->>'maxApplicants')::integer not between 1 and 1000000 or (p_config->>'maxVideoSeconds')::integer <> 210 or (p_config->>'questionsPerCategory')::integer <> 2 then raise exception 'configuration: El video dura hasta 3 min 30 s y 2 preguntas por categoría.'; end if;
  if (p_config->>'maxVideoBytes')::bigint not between 1048576 and 52428800 then raise exception 'configuration: El tamaño máximo de cada video debe estar entre 1 y 50 MiB.'; end if;
  if (p_config->>'enabled')::boolean and (p_config->>'opensAt' is null or p_config->>'closesAt' is null or p_config->>'minAvailabilityHours' is null) then raise exception 'configuration: Define fechas antes de abrir.'; end if;
  insert into recruitment_config_events(actor, kind, before_value, after_value) values(p_actor, 'configuration', c.settings - 'previewKeyHash', p_config - 'revision');
  update recruitment_config set settings = (p_config - 'revision' - 'previewKeyHash') || case when c.settings ? 'previewKeyHash' then jsonb_build_object('previewKeyHash', c.settings->'previewKeyHash') else '{}'::jsonb end, revision = revision + 1, updated_at = now() where singleton;

  -- Al guardar la configuración (ej. ampliar plazo), reactivar borradores que quedaron en 'expired'
  perform recruitment_reactivate_expired_drafts();

  return jsonb_build_object('config', (select (settings - 'previewKeyHash') || jsonb_build_object('revision', revision) from recruitment_config));
end $$;

create or replace function public.recruitment_expire_drafts()
returns integer language plpgsql set search_path=public as $$
declare c jsonb; changed integer := 0; item record; closed boolean;
begin
  select settings into c from recruitment_config for update;
  closed := not coalesce((c->>'enabled')::boolean, false) or (c->>'closesAt' is not null and now() > coalesce((c->>'extensionAt')::timestamptz, (c->>'closesAt')::timestamptz));

  -- Si la convocatoria está abierta (por ejemplo tras una ampliación), reactivar automáticamente los borradores
  if not closed then
    perform recruitment_reactivate_expired_drafts();
  end if;

  for item in select id, status from recruitment_applications where status in ('draft', 'incomplete') and
    (closed or (not reminders_off and not is_test and greatest(updated_at, coalesce(last_reminder_at, '-infinity'::timestamptz)) < now() - make_interval(hours => (c->>'inactivityHours')::integer))) for update loop
    if closed then
      update recruitment_applications set status = 'expired', updated_at = now() where id = item.id;
      insert into recruitment_events(application_id, from_status, to_status, actor, reason) values(item.id, item.status, 'expired', 'sistema', 'Plazo de convocatoria vencido.');
      -- Al cerrarse la convocatoria ya no se envía ningún correo (ni recordatorios ni aviso de expiración)
    else
      if item.status = 'draft' then
        update recruitment_applications set status = 'incomplete' where id = item.id;
        insert into recruitment_events(application_id, from_status, to_status, actor, reason) values(item.id, 'draft', 'incomplete', 'sistema', 'Borrador sin avances: se envió un recordatorio.');
      end if;
      perform recruitment_queue_reminder(item.id);
    end if;
    changed := changed + 1;
  end loop;

  -- Ni bien se cierre la convocatoria, purgar cualquier recordatorio pendiente en la cola de correo
  if closed then
    delete from recruitment_email_outbox
    where template_key in ('incomplete', 'resume', 'expired') and status = 'pending';
  end if;

  return changed;
end $$;

create or replace function public.recruitment_lease_emails(p_limit integer, p_lease_token uuid)
returns jsonb language plpgsql set search_path=public as $$
declare items jsonb; c jsonb; call_closed boolean;
begin
  select settings into c from recruitment_config;
  call_closed := not coalesce((c->>'enabled')::boolean, false) or (c->>'closesAt' is not null and now() > coalesce((c->>'extensionAt')::timestamptz, (c->>'closesAt')::timestamptz));

  -- Ni bien se cierre la convocatoria, purgar recordatorios pendientes
  if call_closed then
    delete from recruitment_email_outbox
    where template_key in ('incomplete', 'resume', 'expired') and status = 'pending';
  end if;

  update recruitment_email_outbox set status = 'failed', lease_token = null, leased_until = null, last_error = 'La reserva del último intento venció sin confirmación del proveedor.' where status = 'leased' and leased_until < now() and attempts >= 5;

  with due as (
    select id from recruitment_email_outbox
    where (status = 'pending' or (status = 'leased' and leased_until < now()))
      and next_attempt_at <= now()
      and attempts < 5
      and exists(select 1 from recruitment_email_templates t where t.key = recruitment_email_outbox.template_key and t.enabled)
      -- Ni bien se cierre la convocatoria, no permitir la salida de ningún recordatorio ni correo de borrador
      and (not call_closed or template_key not in ('incomplete', 'resume', 'expired'))
      and (template_key <> 'incomplete' or (not call_closed and exists(select 1 from recruitment_applications a where a.id = recruitment_email_outbox.application_id and a.status in ('draft', 'incomplete') and not a.reminders_off)))
    order by created_at for update skip locked limit least(greatest(p_limit, 1), 20)
  ),
  leased as (
    update recruitment_email_outbox o
    set status = 'leased', lease_token = p_lease_token, leased_until = now() + interval '5 minutes', attempts = attempts + 1
    from due where o.id = due.id returning o.*
  )
  select jsonb_build_object('items', coalesce(jsonb_agg(jsonb_build_object('id', id, 'applicationId', application_id, 'templateKey', template_key, 'to', recipient, 'subject', subject, 'body', body, 'payload', payload, 'attempts', attempts, 'leaseToken', lease_token)), '[]'::jsonb)) into items from leased;
  return items;
end $$;

create or replace function public.recruitment_get_draft(p_id uuid, p_token_hash text)
returns jsonb language plpgsql set search_path=public as $$
declare a recruitment_applications; c jsonb; call_open boolean;
begin
  select settings into c from recruitment_config for update;
  a := recruitment_require_owner(p_id, p_token_hash);
  call_open := coalesce((c->>'enabled')::boolean, false)
    and c->>'opensAt' is not null and now() >= (c->>'opensAt')::timestamptz and (c->>'closesAt' is null or now() <= coalesce((c->>'extensionAt')::timestamptz, (c->>'closesAt')::timestamptz));

  -- Si la convocatoria está abierta o prorrogada y el borrador estaba marcado como vencido, auto-reactivar
  if call_open and a.status = 'expired' and a.submitted_at is null then
    update recruitment_applications set status = 'incomplete', updated_at = now() where id = p_id;
    insert into recruitment_events(application_id, from_status, to_status, actor, reason)
    values(p_id, 'expired', 'incomplete', 'postulante', 'Borrador retomado durante ampliación de convocatoria.');
    a.status := 'incomplete';
  end if;

  return jsonb_build_object('application', recruitment_application_json(p_id));
end $$;

create or replace function public.recruitment_patch_draft(p_id uuid, p_token_hash text, p_data jsonb)
returns jsonb language plpgsql set search_path=public as $$
declare a recruitment_applications;
begin
  perform recruitment_assert_open();
  a := recruitment_require_owner(p_id, p_token_hash);
  if a.status = 'expired' and a.submitted_at is null then
    update recruitment_applications set status = 'incomplete', updated_at = now() where id = p_id;
    insert into recruitment_events(application_id, from_status, to_status, actor, reason)
    values(p_id, 'expired', 'incomplete', 'postulante', 'Borrador reactivado durante ampliación de plazo.');
    a.status := 'incomplete';
  end if;
  if a.status not in ('draft', 'incomplete') then raise exception 'immutable: Esta postulación ya no admite modificaciones.'; end if;
  if p_data->>'email' <> a.data->>'email' then raise exception 'immutable: El correo del enlace personal no puede cambiarse.'; end if;
  update recruitment_applications set data = p_data, status = 'draft', updated_at = now() where id = p_id;
  if a.status in ('incomplete', 'expired') then
    insert into recruitment_events(application_id, from_status, to_status, actor, reason)
    values(p_id, a.status, 'draft', 'postulante', 'Borrador retomado dentro del plazo.');
  end if;
  return jsonb_build_object('application', recruitment_application_json(p_id));
end $$;

create or replace function public.recruitment_admin_applications(p_id uuid default null)
returns jsonb language plpgsql set search_path=public as $$
begin
  perform recruitment_reactivate_expired_drafts();
  return (
    select case when p_id is null then jsonb_build_object('applications', coalesce(jsonb_agg(recruitment_application_json(a.id, true) order by a.created_at desc), '[]'::jsonb))
    else jsonb_build_object('application', recruitment_application_json(p_id, true)) end from recruitment_applications a where p_id is null or a.id = p_id
  );
end $$;

revoke all on function public.recruitment_reactivate_expired_drafts() from public, anon, authenticated;
grant execute on function public.recruitment_reactivate_expired_drafts() to service_role;
grant execute on function public.recruitment_update_config(jsonb, text) to service_role;
grant execute on function public.recruitment_expire_drafts() to service_role;
grant execute on function public.recruitment_lease_emails(integer, uuid) to service_role;
grant execute on function public.recruitment_get_draft(uuid, text) to service_role;
grant execute on function public.recruitment_patch_draft(uuid, text, jsonb) to service_role;
grant execute on function public.recruitment_admin_applications(uuid) to service_role;

-- Ejecutar inmediatamente para reactivar cualquier borrador que haya quedado vencido si la convocatoria actual tiene ampliación activa
select public.recruitment_reactivate_expired_drafts();
