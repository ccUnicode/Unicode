-- Director campaign: one visible To group per area. Independent of registration closure.
begin;
create table public.recruitment_director_campaign (
 singleton boolean primary key default true check(singleton),
 initialized boolean not null default false,
 ends_at timestamptz not null default '2026-10-19T05:00:00Z'
);
insert into recruitment_director_campaign(singleton) values(true);
alter table recruitment_area_evaluation add column director_had_pending boolean not null default false;
create table public.recruitment_director_mail (
 id uuid primary key default gen_random_uuid(), area text not null references recruitment_area_evaluation(area),
 kind text not null check(kind in ('pending','transfer','close')), dedupe text not null unique,
 application_id uuid references recruitment_applications(id) on delete cascade,
 status text not null default 'pending', attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(), lease_token uuid, leased_until timestamptz,
 created_at timestamptz not null default now(), sent_at timestamptz, message_id text
);
alter table recruitment_director_campaign enable row level security;
alter table recruitment_director_mail enable row level security;
revoke all on recruitment_director_campaign,recruitment_director_mail from public,anon,authenticated;
grant all on recruitment_director_campaign,recruitment_director_mail to service_role;

create function public.recruitment_director_pending(p_area text) returns jsonb language sql stable set search_path=public as $$
 select jsonb_build_object('first',count(*) filter(where evaluation_choice=1),'second',count(*) filter(where evaluation_choice=2),'total',count(*))
 from recruitment_applications where not is_test and submitted_at is not null
 and case when evaluation_choice=2 then data->>'secondChoiceArea' else data->>'firstChoiceArea' end=p_area
 and status in ('submitted','profile_validated','test_sent','test_completed','awaiting_second_review','interview_eligible','interview_scheduled','interviewed','group_eligible','group_scheduled','group_completed','waitlisted')
$$;

create function public.recruitment_director_transfer() returns trigger language plpgsql set search_path=public as $$
begin
 if new.evaluation_choice=2 and old.evaluation_choice=1 and not new.is_test
 and exists(select 1 from recruitment_director_campaign where initialized and now()<ends_at) then
  insert into recruitment_director_mail(area,kind,dedupe,application_id)
  values(new.data->>'secondChoiceArea','transfer','transfer:'||new.id,new.id) on conflict do nothing;
 end if;
 return new;
end $$;
create trigger recruitment_director_transfer after update of evaluation_choice on recruitment_applications
 for each row execute function recruitment_director_transfer();

create function public.recruitment_director_schedule() returns void language plpgsql set search_path=public as $$
declare c recruitment_director_campaign; a record; counts jsonb; first_run boolean; day text;
begin
 select * into c from recruitment_director_campaign where singleton for update;
 if now()>=c.ends_at then
  update recruitment_director_mail set status='expired',lease_token=null where status in ('pending','leased'); return;
 end if;
 first_run:=not c.initialized;
 day:=to_char(now() at time zone 'America/Lima','YYYY-MM-DD');
 for a in select * from recruitment_area_evaluation loop
  counts:=recruitment_director_pending(a.area);
  if (counts->>'total')::integer>0 and (first_run or (now() at time zone 'America/Lima')::time>='09:00') then
   insert into recruitment_director_mail(area,kind,dedupe) values(a.area,'pending','pending:'||a.area||':'||day) on conflict do nothing;
  elsif not first_run and a.director_had_pending and (counts->>'total')::integer=0 and not a.closed
   and not exists(select 1 from recruitment_director_mail where area=a.area and kind='close'
    and (status in ('pending','leased') or sent_at>now()-interval '48 hours')) then
   insert into recruitment_director_mail(area,kind,dedupe) values(a.area,'close','close:'||a.area||':'||gen_random_uuid());
  end if;
  if (counts->>'total')::integer>0 then
   update recruitment_area_evaluation set director_had_pending=true where area=a.area;
  end if;
 end loop;
 update recruitment_director_campaign set initialized=true where singleton;
end $$;

create function public.recruitment_director_lease(p_limit integer,p_lease_token uuid) returns jsonb language plpgsql set search_path=public as $$
declare m recruitment_director_mail; counts jsonb; recipients jsonb; items jsonb:='[]';
begin
 -- Expire stale notices and retries, including notices waiting through a provider pause.
 update recruitment_director_mail set status='expired',lease_token=null where status in ('pending','leased') and (
 now()>=(select ends_at from recruitment_director_campaign where singleton)
 or (kind='pending' and (split_part(dedupe,':',3)<>to_char(now() at time zone 'America/Lima','YYYY-MM-DD') or (recruitment_director_pending(area)->>'total')::integer=0))
 or (kind='close' and ((recruitment_director_pending(area)->>'total')::integer>0 or exists(select 1 from recruitment_area_evaluation a where a.area=recruitment_director_mail.area and a.closed)))
 or (kind='transfer' and not exists(select 1 from recruitment_applications a where a.id=application_id and a.evaluation_choice=2 and not a.is_test and a.submitted_at is not null
   and a.status in ('submitted','profile_validated','test_sent','test_completed','awaiting_second_review','interview_eligible','interview_scheduled','interviewed','group_eligible','group_scheduled','group_completed','waitlisted')
   and a.data->>'secondChoiceArea'=area)));
 update recruitment_director_mail set status='failed' where status='leased' and leased_until<now() and attempts>=5;
 for m in select * from recruitment_director_mail where (status='pending' or (status='leased' and leased_until<now()))
 and next_attempt_at<=now() and attempts<5 order by created_at for update skip locked limit least(greatest(p_limit,1),20) loop
  select jsonb_agg(jsonb_build_object('email',email,'name',name) order by name,email) into recipients from recruitment_directors where area=m.area;
  if recipients is null then continue; end if;
  counts:=recruitment_director_pending(m.area);
  update recruitment_director_mail set status='leased',lease_token=p_lease_token,leased_until=now()+interval '5 minutes',attempts=attempts+1 where id=m.id;
  items:=items||jsonb_build_array(jsonb_build_object('id',m.id,'area',m.area,'kind',m.kind,'recipients',recipients,'counts',counts));
 end loop;
 return jsonb_build_object('items',items);
end $$;
create function public.recruitment_director_finish(p_id uuid,p_lease_token uuid,p_message_id text) returns void language plpgsql set search_path=public as $$
begin
 update recruitment_director_mail set status=case when p_message_id is not null then 'sent' when attempts>=5 then 'failed' else 'pending' end,
 sent_at=case when p_message_id is not null then now() else null end,message_id=p_message_id,
 next_attempt_at=now()+interval '5 minutes',lease_token=null,leased_until=null
 where id=p_id and status='leased' and lease_token=p_lease_token;
end $$;
do $$ declare f text; begin
 foreach f in array array['recruitment_director_pending(text)','recruitment_director_transfer()','recruitment_director_schedule()','recruitment_director_lease(integer,uuid)','recruitment_director_finish(uuid,uuid,text)'] loop
 execute 'revoke all on function public.'||f||' from public,anon,authenticated';
 execute 'grant execute on function public.'||f||' to service_role';
 end loop;
end $$;
commit;
