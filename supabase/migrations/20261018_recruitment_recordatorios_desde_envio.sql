begin;

-- Count the cooldown from provider acceptance, never from enqueueing or a failed attempt.
create or replace function public.recruitment_record_reminder_sent(p_id uuid, p_sent_at timestamptz)
returns void language plpgsql set search_path=public as $$
begin
  update recruitment_applications
  set last_reminder_at = greatest(last_reminder_at, p_sent_at)
  where id = p_id;
  -- A recent successful message supersedes any reminder waiting behind it.
  update recruitment_email_outbox set status = 'failed', last_error = 'Recordatorio omitido: ya se envió un correo reciente.'
  where application_id = p_id and template_key = 'incomplete' and status = 'pending';
end $$;

create or replace function public.recruitment_track_reminder_sent()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.status = 'sent' and old.status <> 'sent' and new.template_key in ('resume', 'incomplete') then
    perform recruitment_record_reminder_sent(new.application_id, new.sent_at);
  end if;
  return new;
end $$;

create trigger recruitment_reminder_sent after update of status on public.recruitment_email_outbox
for each row execute function public.recruitment_track_reminder_sent();

create or replace function public.recruitment_queue_reminder(p_id uuid)
returns void language plpgsql set search_path=public as $$
declare a recruitment_applications; c jsonb; resume_secret jsonb;
begin
  select settings into c from recruitment_config;
  select * into a from recruitment_applications where id = p_id for update;
  if not found or a.status not in ('draft', 'incomplete') or a.reminders_off or a.is_test then return; end if;
  if greatest(a.updated_at, coalesce(a.last_reminder_at, '-infinity'::timestamptz)) >
    now() - make_interval(hours => greatest(8, coalesce((c->>'inactivityHours')::integer, 8))) then return; end if;
  if exists(select 1 from recruitment_email_outbox where application_id = p_id
    and template_key in ('resume', 'incomplete') and status in ('pending', 'leased')) then return; end if;
  select jsonb_build_object('resumeSecret', payload->>'resumeSecret') into resume_secret
  from recruitment_email_outbox where application_id = p_id and template_key = 'resume';
  perform recruitment_enqueue(p_id, 'incomplete', coalesce(resume_secret, '{}'::jsonb));
end $$;

revoke all on function public.recruitment_record_reminder_sent(uuid,timestamptz) from public,anon,authenticated;
revoke all on function public.recruitment_track_reminder_sent() from public,anon,authenticated;
grant execute on function public.recruitment_record_reminder_sent(uuid,timestamptz) to service_role;

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
    (closed or (not reminders_off and not is_test and not exists(select 1 from recruitment_email_outbox o where o.application_id = recruitment_applications.id and o.template_key in ('resume', 'incomplete') and o.status in ('pending', 'leased')) and greatest(updated_at, coalesce(last_reminder_at, '-infinity'::timestamptz)) < now() - make_interval(hours => greatest(8, coalesce((c->>'inactivityHours')::integer, 8))))) for update loop
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

create or replace function public.recruitment_remind_all(p_actor text) returns integer language plpgsql set search_path=public as $$
declare item record; queued integer:=0; before_count integer; after_count integer;
begin
  perform recruitment_assert_open();
  for item in select id from recruitment_applications where status in ('draft','incomplete') and not reminders_off and not is_test and coalesce(data->>'email','')<>'' for update loop
    select count(*) into before_count from recruitment_email_outbox where application_id=item.id and template_key='incomplete';
    perform recruitment_queue_reminder(item.id);
    select count(*) into after_count from recruitment_email_outbox where application_id=item.id and template_key='incomplete';
    queued:=queued+after_count-before_count;
  end loop;
  insert into recruitment_config_events(actor,kind,before_value,after_value) values(coalesce(p_actor,'administracion'),'reminders',null,jsonb_build_object('queued',queued));
  return queued;
end $$;

commit;

