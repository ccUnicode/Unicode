-- Emails already queued for a template that was later disabled stay in the queue unsent: only
-- enabled templates are leased. Re-enabling a template sends what was waiting. Run once.
create or replace function public.recruitment_lease_emails(p_limit integer,p_lease_token uuid) returns jsonb language plpgsql set search_path=public as $$
declare items jsonb;
begin
 update recruitment_email_outbox set status='failed',lease_token=null,leased_until=null,last_error='La reserva del último intento venció sin confirmación del proveedor.' where status='leased' and leased_until<now() and attempts>=5;
 with due as (select id from recruitment_email_outbox where (status='pending' or (status='leased' and leased_until<now())) and next_attempt_at<=now() and attempts<5
   and exists(select 1 from recruitment_email_templates t where t.key=recruitment_email_outbox.template_key and t.enabled) order by created_at for update skip locked limit least(greatest(p_limit,1),20)),
 leased as (update recruitment_email_outbox o set status='leased',lease_token=p_lease_token,leased_until=now()+interval '5 minutes',attempts=attempts+1 from due where o.id=due.id returning o.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'applicationId',application_id,'templateKey',template_key,'to',recipient,'subject',subject,'body',body,'payload',payload,'attempts',attempts,'leaseToken',lease_token)),'[]'::jsonb) into items from leased;
 return jsonb_build_object('items',items);
end $$;
revoke all on function public.recruitment_lease_emails(integer,uuid) from public, anon, authenticated;
grant execute on function public.recruitment_lease_emails(integer,uuid) to service_role;
