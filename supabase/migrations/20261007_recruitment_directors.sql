-- Director access: each director signs in with a one-time code sent to their email.
-- Directors see the applications of their own area; GTH directors see every area and manage the call.
-- Additive: run once after the previous recruitment migrations.
create table if not exists public.recruitment_directors (
  email text primary key check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  area text not null check (area in ('ID','RRPP','GTH','ACD','DCC','LGE','FIN')),
  name text not null default '' check (length(name) <= 150),
  created_at timestamptz not null default now()
);

-- Only the SHA-256 of each code is stored. Codes last 10 minutes, allow 5 attempts and are single use.
create table if not exists public.recruitment_login_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  attempts integer not null default 0,
  used_at timestamptz
);
create index if not exists recruitment_login_codes_email on public.recruitment_login_codes(email, created_at desc);
alter table public.recruitment_directors enable row level security;
alter table public.recruitment_login_codes enable row level security;
revoke all on public.recruitment_directors, public.recruitment_login_codes from public;
do $$ begin
 if exists(select 1 from pg_roles where rolname='anon') then revoke all on public.recruitment_directors, public.recruitment_login_codes from anon; end if;
 if exists(select 1 from pg_roles where rolname='authenticated') then revoke all on public.recruitment_directors, public.recruitment_login_codes from authenticated; end if;
 if exists(select 1 from pg_roles where rolname='service_role') then grant all on public.recruitment_directors, public.recruitment_login_codes to service_role; end if;
end $$;

-- Issues a code only for listed directors and at most 5 per hour; earlier unused codes stop working.
create or replace function public.recruitment_login_request(p_email text,p_code_hash text) returns jsonb language plpgsql set search_path=public as $$
declare d recruitment_directors;
begin
 select * into d from recruitment_directors where email=lower(trim(p_email));
 if not found then return jsonb_build_object('sent',false); end if;
 if (select count(*) from recruitment_login_codes where email=d.email and created_at>now()-interval '1 hour')>=5 then return jsonb_build_object('sent',false,'limited',true); end if;
 update recruitment_login_codes set used_at=now() where email=d.email and used_at is null;
 insert into recruitment_login_codes(email,code_hash,expires_at) values(d.email,p_code_hash,now()+interval '10 minutes');
 delete from recruitment_login_codes where created_at<now()-interval '1 day';
 return jsonb_build_object('sent',true,'email',d.email,'area',d.area,'name',d.name);
end $$;

-- Returns instead of raising so a wrong attempt is counted, not rolled back.
create or replace function public.recruitment_login_verify(p_email text,p_code_hash text) returns jsonb language plpgsql set search_path=public as $$
declare c recruitment_login_codes; d recruitment_directors;
begin
 select * into c from recruitment_login_codes where email=lower(trim(p_email)) and used_at is null and expires_at>now() order by created_at desc limit 1 for update;
 if not found then return jsonb_build_object('ok',false,'error','El código venció o ya se usó. Pide uno nuevo.'); end if;
 if c.code_hash<>p_code_hash then
  update recruitment_login_codes set attempts=attempts+1,used_at=case when attempts+1>=5 then now() end where id=c.id;
  return jsonb_build_object('ok',false,'error',case when c.attempts+1>=5 then 'Demasiados intentos. Pide un código nuevo.' else 'Código incorrecto.' end);
 end if;
 update recruitment_login_codes set used_at=now() where id=c.id;
 select * into d from recruitment_directors where email=c.email;
 if not found then return jsonb_build_object('ok',false,'error','Tu correo ya no tiene acceso.'); end if;
 return jsonb_build_object('ok',true,'email',d.email,'area',d.area,'name',d.name);
end $$;

create or replace function public.recruitment_directors(p_directors jsonb default null,p_actor text default null) returns jsonb language plpgsql set search_path=public as $$
declare before_value jsonb;
begin
 if p_directors is not null then
  if jsonb_typeof(p_directors)<>'array' or jsonb_array_length(p_directors)>60 then raise exception 'configuration: Lista de directores inválida.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('email',email,'area',area,'name',name) order by area,email),'[]'::jsonb) into before_value from recruitment_directors;
  delete from recruitment_directors where true;
  insert into recruitment_directors(email,area,name)
   select lower(trim(value->>'email')),value->>'area',coalesce(trim(value->>'name'),'') from jsonb_array_elements(p_directors);
  insert into recruitment_config_events(actor,kind,before_value,after_value) values(coalesce(p_actor,'administracion'),'directors',before_value,p_directors);
 end if;
 return jsonb_build_object('directors',(select coalesce(jsonb_agg(jsonb_build_object('email',email,'area',area,'name',name) order by area,email),'[]'::jsonb) from recruitment_directors));
end $$;

revoke all on function public.recruitment_login_request(text,text) from public;
revoke all on function public.recruitment_login_verify(text,text) from public;
revoke all on function public.recruitment_directors(jsonb,text) from public;
do $$ declare f text; begin
 foreach f in array array['public.recruitment_login_request(text,text)','public.recruitment_login_verify(text,text)','public.recruitment_directors(jsonb,text)'] loop
  if exists(select 1 from pg_roles where rolname='anon') then execute format('revoke all on function %s from anon',f); end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then execute format('revoke all on function %s from authenticated',f); end if;
  if exists(select 1 from pg_roles where rolname='service_role') then execute format('grant execute on function %s to service_role',f); end if;
 end loop;
end $$;
