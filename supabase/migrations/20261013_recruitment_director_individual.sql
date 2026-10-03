-- The access list is edited one director at a time (add or change area, or remove) instead of
-- replacing the whole list on every save. Run once.
create or replace function public.recruitment_director_save(p_email text,p_area text,p_name text,p_actor text) returns jsonb language plpgsql set search_path=public as $$
declare v_email text:=lower(trim(p_email)); before_value jsonb;
begin
 select jsonb_build_object('email',d.email,'area',d.area,'name',d.name) into before_value from recruitment_directors d where d.email=v_email;
 insert into recruitment_directors(email,area,name) values(v_email,p_area,left(coalesce(trim(p_name),''),150))
 on conflict(email) do update set area=excluded.area,name=excluded.name;
 insert into recruitment_config_events(actor,kind,before_value,after_value) values(coalesce(p_actor,'administracion'),'director',before_value,jsonb_build_object('email',v_email,'area',p_area,'name',coalesce(trim(p_name),'')));
 return recruitment_directors();
end $$;

create or replace function public.recruitment_director_remove(p_email text,p_actor text) returns jsonb language plpgsql set search_path=public as $$
declare v_email text:=lower(trim(p_email)); before_value jsonb;
begin
 select jsonb_build_object('email',d.email,'area',d.area,'name',d.name) into before_value from recruitment_directors d where d.email=v_email;
 if before_value is null then raise exception 'not_found: Ese correo ya no tiene acceso.'; end if;
 delete from recruitment_directors d where d.email=v_email;
 update recruitment_login_codes set used_at=now() where recruitment_login_codes.email=v_email and used_at is null;
 insert into recruitment_config_events(actor,kind,before_value,after_value) values(coalesce(p_actor,'administracion'),'director',before_value,null);
 return recruitment_directors();
end $$;

do $$ declare f text; begin
 foreach f in array array['public.recruitment_director_save(text,text,text,text)','public.recruitment_director_remove(text,text)'] loop
  execute format('revoke all on function %s from public',f);
  if exists(select 1 from pg_roles where rolname='anon') then execute format('revoke all on function %s from anon',f); end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then execute format('revoke all on function %s from authenticated',f); end if;
  if exists(select 1 from pg_roles where rolname='service_role') then execute format('grant execute on function %s to service_role',f); end if;
 end loop;
end $$;
