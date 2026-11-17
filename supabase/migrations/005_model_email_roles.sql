-- Per-model email roles. Invitations work before the recipient registers.
alter table public.model_viewer_invites add column role text not null default 'viewer' check(role in ('viewer','editor'));
create or replace function public.manages_model(mid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null) and (
 exists(select 1 from financial_models m where m.id=mid and can_edit_org(m.organization_id)) or
 exists(select 1 from model_editors e where e.model_id=mid and e.user_id=auth.uid()) or
 exists(select 1 from model_viewer_invites i join auth.users u on lower(u.email)=i.email where i.model_id=mid and i.role='editor' and u.id=auth.uid() and u.email_confirmed_at is not null))
$$;
create function public.set_model_email_access(mid uuid,recipient text,access_role text) returns void language plpgsql security definer set search_path=public as $$
declare mail text:=lower(trim(recipient));
begin
 if not manages_model(mid) then raise exception 'Model manager access required';end if;
 if access_role not in ('viewer','editor') or access_role is null then raise exception 'Invalid role';end if;
 if mail is null or mail !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email';end if;
 if exists(select 1 from auth.users u join organization_members om on om.user_id=u.id join financial_models m on m.organization_id=om.organization_id where m.id=mid and lower(u.email)=mail and om.role in ('owner','editor')) then raise exception 'Workspace owner/editor already has access';end if;
 -- Remove legacy grants so downgrade/revoke cannot leave hidden write access.
 delete from model_editors e using auth.users u where e.user_id=u.id and e.model_id=mid and lower(u.email)=mail;
 update model_access_requests set status='rejected' where model_id=mid and lower(email)=mail and status='approved';
 insert into model_viewer_invites(model_id,email,role,granted_by) values(mid,mail,access_role,auth.uid())
 on conflict(model_id,email) do update set role=excluded.role,granted_by=excluded.granted_by;
end $$;
create or replace function public.invite_model_viewer(mid uuid,recipient text) returns void language plpgsql security definer set search_path=public as $$
begin perform set_model_email_access(mid,recipient,'viewer');end $$;
create or replace function public.revoke_model_viewer(mid uuid,recipient text) returns void language plpgsql security definer set search_path=public as $$
begin
 if not manages_model(mid) then raise exception 'Model manager access required';end if;
 delete from model_viewer_invites where model_id=mid and email=lower(trim(recipient));
 delete from model_editors e using auth.users u where e.user_id=u.id and e.model_id=mid and lower(u.email)=lower(trim(recipient));
 update model_access_requests set status='rejected' where model_id=mid and lower(email)=lower(trim(recipient)) and status='approved';
end $$;
create or replace function public.can_view_invited_model(mid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null) and (exists(select 1 from model_editors e where e.model_id=mid and e.user_id=auth.uid()) or exists(select 1 from model_viewer_invites i join auth.users u on lower(u.email)=i.email where i.model_id=mid and u.id=auth.uid() and u.email_confirmed_at is not null))
$$;
create function public.list_model_invitations() returns table(model jsonb,access_role text) language sql stable security definer set search_path=public as $$
 select m.data,case when manages_model(m.id) then 'editor' else 'viewer' end from financial_models m
 where can_view_invited_model(m.id) and not can_edit_org(m.organization_id) order by m.updated_at desc
$$;
revoke all on function public.set_model_email_access(uuid,text,text),public.list_model_invitations() from public;
grant execute on function public.set_model_email_access(uuid,text,text),public.list_model_invitations() to authenticated;

create or replace function public.create_model_share(model_uuid uuid) returns text language plpgsql security definer set search_path=public,extensions as $$
declare token text;
begin
 if not manages_model(model_uuid) then raise exception 'Editor access required';end if;
 token:=encode(gen_random_bytes(32),'hex');
 insert into model_shares(model_id,token_hash,expires_at) values(model_uuid,encode(digest(token,'sha256'),'hex'),now()+interval '7 days');
 return token;
end $$;
