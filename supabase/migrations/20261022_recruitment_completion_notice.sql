-- One private completion notice for the campaign owner; independent of area reception closure.
begin;
create table public.recruitment_completion_mail (
 singleton boolean primary key default true check(singleton),
 id uuid not null default gen_random_uuid(),
 status text not null default 'idle' check(status in ('idle','pending','leased','sent','failed','expired')),
 attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(),
 lease_token uuid, leased_until timestamptz, sent_at timestamptz, message_id text
);
insert into recruitment_completion_mail(singleton) values(true);
alter table recruitment_completion_mail enable row level security;
revoke all on recruitment_completion_mail from public,anon,authenticated;
grant all on recruitment_completion_mail to service_role;

create function public.recruitment_completion_lease(p_lease_token uuid) returns jsonb language plpgsql set search_path=public as $$
declare m recruitment_completion_mail; area_states jsonb; pending_count integer;
begin
 select * into m from recruitment_completion_mail where singleton for update;
 if m.status in ('sent','failed','expired') then return jsonb_build_object('items','[]'::jsonb); end if;
 if now()>=(select ends_at from recruitment_director_campaign where singleton) then
  update recruitment_completion_mail set status='expired',lease_token=null,leased_until=null where singleton;
  return jsonb_build_object('items','[]'::jsonb);
 end if;
 -- A fresh/empty database is not a completed recruitment campaign.
 if not exists(select 1 from recruitment_applications where not is_test and submitted_at is not null) then
  return jsonb_build_object('items','[]'::jsonb);
 end if;
 select coalesce(sum((recruitment_director_pending(area)->>'total')::integer),0),
  jsonb_agg(jsonb_build_object('area',area,'closed',closed) order by area)
 into pending_count,area_states from recruitment_area_evaluation;
 if pending_count<>0 or (m.status='leased' and m.leased_until>now()) or m.next_attempt_at>now() then
  return jsonb_build_object('items','[]'::jsonb);
 end if;
 if m.attempts>=5 then
  update recruitment_completion_mail set status='failed',lease_token=null,leased_until=null where singleton;
  return jsonb_build_object('items','[]'::jsonb);
 end if;
 update recruitment_completion_mail set status='leased',attempts=attempts+1,lease_token=p_lease_token,leased_until=now()+interval '5 minutes' where singleton;
 return jsonb_build_object('items',jsonb_build_array(jsonb_build_object('id',m.id,'kind','complete',
  'recipients',jsonb_build_array(jsonb_build_object('email','lenin.castro.a@uni.pe','name','Lenin Castro')),'areas',area_states)));
end $$;

create function public.recruitment_completion_finish(p_id uuid,p_lease_token uuid,p_message_id text) returns void language plpgsql set search_path=public as $$
begin
 update recruitment_completion_mail set
  status=case when p_message_id is not null then 'sent' when attempts>=5 then 'failed' else 'pending' end,
  sent_at=case when p_message_id is not null then now() else null end,message_id=p_message_id,
  next_attempt_at=now()+interval '5 minutes',lease_token=null,leased_until=null
 where id=p_id and status='leased' and lease_token=p_lease_token;
end $$;
revoke all on function public.recruitment_completion_lease(uuid), public.recruitment_completion_finish(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.recruitment_completion_lease(uuid), public.recruitment_completion_finish(uuid,uuid,text) to service_role;
commit;
