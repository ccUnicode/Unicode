-- Raises the sign-in code limit from 5 to 20 per email per hour: no one trying normally reaches it,
-- and a director's inbox still cannot be flooded. Run once.
create or replace function public.recruitment_login_request(p_email text,p_code_hash text) returns jsonb language plpgsql set search_path=public as $$
declare d recruitment_directors;
begin
 select * into d from recruitment_directors where email=lower(trim(p_email));
 if not found then return jsonb_build_object('sent',false); end if;
 if (select count(*) from recruitment_login_codes where email=d.email and created_at>now()-interval '1 hour')>=20 then return jsonb_build_object('sent',false,'limited',true); end if;
 update recruitment_login_codes set used_at=now() where email=d.email and used_at is null;
 insert into recruitment_login_codes(email,code_hash,expires_at) values(d.email,p_code_hash,now()+interval '10 minutes');
 delete from recruitment_login_codes where created_at<now()-interval '1 day';
 return jsonb_build_object('sent',true,'email',d.email,'area',d.area,'name',d.name);
end $$;
revoke all on function public.recruitment_login_request(text,text) from public, anon, authenticated;
grant execute on function public.recruitment_login_request(text,text) to service_role;
