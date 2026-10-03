-- Reminders to finish the application: every N hours without progress (8 by default) instead of
-- once, a button to remind everyone now, and a link to stop receiving them. Test applications are
-- never reminded. Run once.
alter table public.recruitment_applications add column if not exists reminders_off boolean not null default false;
alter table public.recruitment_applications add column if not exists last_reminder_at timestamptz;

-- Every other email is still sent once per application; reminders can repeat.
do $$ declare item record; begin
 for item in select conname from pg_constraint where conrelid='public.recruitment_email_outbox'::regclass and contype='u' loop
  execute format('alter table public.recruitment_email_outbox drop constraint %I',item.conname);
 end loop;
end $$;
create unique index if not exists recruitment_outbox_once on public.recruitment_email_outbox(application_id, template_key) where template_key<>'incomplete';

create or replace function public.recruitment_enqueue(p_id uuid,p_key text,p_extra jsonb default '{}'::jsonb)
returns void language plpgsql set search_path=public as $$
begin
 insert into recruitment_email_outbox(application_id,template_key,recipient,subject,body,payload)
 select a.id,t.key,a.data->>'email',t.subject,t.body,
 jsonb_build_object('firstName',a.data->>'firstName','lastName',a.data->>'lastName','status',a.status,'title',c.settings->>'title')||p_extra
 from recruitment_applications a cross join recruitment_config c cross join recruitment_email_templates t
 where a.id=p_id and t.key=p_key and t.enabled
 on conflict(application_id,template_key) where template_key<>'incomplete' do nothing;
end $$;

-- Queues one reminder with the personal link (kept encrypted in the first email's payload).
create or replace function public.recruitment_queue_reminder(p_id uuid) returns void language plpgsql set search_path=public as $$
declare resume_secret jsonb;
begin
 select jsonb_build_object('resumeSecret',payload->>'resumeSecret') into resume_secret from recruitment_email_outbox where application_id=p_id and template_key='resume';
 update recruitment_applications set last_reminder_at=now() where id=p_id;
 perform recruitment_enqueue(p_id,'incomplete',coalesce(resume_secret,'{}'::jsonb));
end $$;

create or replace function public.recruitment_expire_drafts() returns integer language plpgsql set search_path=public as $$
declare c jsonb; changed integer:=0; item record; closed boolean;
begin
 select settings into c from recruitment_config for update;
 closed := c->>'closesAt' is not null and now()>coalesce((c->>'extensionAt')::timestamptz,(c->>'closesAt')::timestamptz);
 for item in select id,status from recruitment_applications where status in ('draft','incomplete') and
   (closed or (not reminders_off and not is_test and greatest(updated_at,coalesce(last_reminder_at,'-infinity'::timestamptz))<now()-make_interval(hours=>(c->>'inactivityHours')::integer))) for update loop
   if closed then
     update recruitment_applications set status='expired',updated_at=now() where id=item.id;
     insert into recruitment_events(application_id,from_status,to_status,actor,reason) values(item.id,item.status,'expired','sistema','Plazo de convocatoria vencido.');
     perform recruitment_enqueue(item.id,'expired');
   else
     if item.status='draft' then
       update recruitment_applications set status='incomplete' where id=item.id;
       insert into recruitment_events(application_id,from_status,to_status,actor,reason) values(item.id,'draft','incomplete','sistema','Borrador sin avances: se envió un recordatorio.');
     end if;
     perform recruitment_queue_reminder(item.id);
   end if;
   changed:=changed+1;
 end loop;
 return changed;
end $$;

-- GTH reminds every unfinished, non-test application that still accepts reminders, right now.
create or replace function public.recruitment_remind_all(p_actor text) returns integer language plpgsql set search_path=public as $$
declare item record; sent integer:=0;
begin
 perform recruitment_assert_open();
 for item in select id from recruitment_applications where status in ('draft','incomplete') and not reminders_off and not is_test and coalesce(data->>'email','')<>'' for update loop
   perform recruitment_queue_reminder(item.id);
   sent:=sent+1;
 end loop;
 insert into recruitment_config_events(actor,kind,before_value,after_value) values(coalesce(p_actor,'administracion'),'reminders',null,jsonb_build_object('queued',sent));
 return sent;
end $$;

create or replace function public.recruitment_unsubscribe(p_id uuid) returns boolean language plpgsql set search_path=public as $$
begin
 update recruitment_applications set reminders_off=true where id=p_id;
 delete from recruitment_email_outbox where application_id=p_id and template_key='incomplete' and status='pending';
 return found;
end $$;

create or replace function public.recruitment_application_json(p_id uuid,p_history boolean default false)
returns jsonb language sql set search_path=public as $$
 select jsonb_build_object('id',a.id,'data',a.data,
 'questions',case when p_history or a.video is not null or a.recording_attempts>a.technical_failure_count then a.questions else '[]'::jsonb end,
 'status',a.status,'video',a.video,
 'technicalFailureCount',a.technical_failure_count,'recordingAttempts',a.recording_attempts,
 'alternateAllowed',false,'remindersOff',a.reminders_off,'lastReminderAt',a.last_reminder_at,
 'isTest',a.is_test,'createdAt',a.created_at,'updatedAt',a.updated_at,'submittedAt',a.submitted_at) ||
 case when p_history then jsonb_build_object('history',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'fromStatus',e.from_status,'toStatus',e.to_status,'actor',e.actor,'reason',e.reason,'createdAt',e.created_at) order by e.created_at) from recruitment_events e where e.application_id=a.id),'[]'::jsonb)) else '{}'::jsonb end
 from recruitment_applications a where a.id=p_id
$$;

-- Reminders only go out while the application is still unfinished and accepts them.
create or replace function public.recruitment_lease_emails(p_limit integer,p_lease_token uuid) returns jsonb language plpgsql set search_path=public as $$
declare items jsonb;
begin
 update recruitment_email_outbox set status='failed',lease_token=null,leased_until=null,last_error='La reserva del último intento venció sin confirmación del proveedor.' where status='leased' and leased_until<now() and attempts>=5;
 with due as (select id from recruitment_email_outbox where (status='pending' or (status='leased' and leased_until<now())) and next_attempt_at<=now() and attempts<5
   and exists(select 1 from recruitment_email_templates t where t.key=recruitment_email_outbox.template_key and t.enabled)
   -- A reminder is dropped if the applicant finished or opted out before it went out.
   and (template_key<>'incomplete' or exists(select 1 from recruitment_applications a where a.id=recruitment_email_outbox.application_id and a.status in ('draft','incomplete') and not a.reminders_off)) order by created_at for update skip locked limit least(greatest(p_limit,1),20)),
 leased as (update recruitment_email_outbox o set status='leased',lease_token=p_lease_token,leased_until=now()+interval '5 minutes',attempts=attempts+1 from due where o.id=due.id returning o.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'applicationId',application_id,'templateKey',template_key,'to',recipient,'subject',subject,'body',body,'payload',payload,'attempts',attempts,'leaseToken',lease_token)),'[]'::jsonb) into items from leased;
 return jsonb_build_object('items',items);
end $$;

update public.recruitment_config set settings=settings||'{"inactivityHours":8}'::jsonb,revision=revision+1,updated_at=now() where singleton;

do $$ declare f text; begin
 foreach f in array array['public.recruitment_enqueue(uuid,text,jsonb)','public.recruitment_queue_reminder(uuid)','public.recruitment_expire_drafts()','public.recruitment_remind_all(text)','public.recruitment_unsubscribe(uuid)','public.recruitment_application_json(uuid,boolean)','public.recruitment_lease_emails(integer,uuid)'] loop
  execute format('revoke all on function %s from public',f);
  if exists(select 1 from pg_roles where rolname='anon') then execute format('revoke all on function %s from anon',f); end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then execute format('revoke all on function %s from authenticated',f); end if;
  if exists(select 1 from pg_roles where rolname='service_role') then execute format('grant execute on function %s to service_role',f); end if;
 end loop;
end $$;
