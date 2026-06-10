-- Kagu Team — rls_checks.sql
-- Run AFTER all migrations, in the Supabase SQL editor.
-- Verifies the security model by impersonating users with set-local JWT
-- claims. Everything runs in one transaction and is ROLLED BACK at the end —
-- it leaves no data behind. Output: a list of PASS rows; any failure aborts
-- with an exception describing what leaked.

begin;

-- --- fixtures: three users -------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@test.local',  'x', now(), '{}', '{"full_name":"Owner"}',  now(), now()),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'member@test.local', 'x', now(), '{}', '{"full_name":"Member"}', now(), now()),
  ('00000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000c', 'authenticated', 'authenticated', 'client@test.local', 'x', now(), '{}', '{"full_name":"Client"}', now(), now()),
  ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outsider@test.local', 'x', now(), '{}', '{"full_name":"Outsider"}', now(), now());

create or replace function pg_temp.impersonate(p_uid uuid, p_email text)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'email', p_email)::text, true);
  perform set_config('role', 'authenticated', true);
end; $$;

create or replace function pg_temp.reset_role()
returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
end; $$;

-- --- owner builds a workspace with a project + task ------------------------
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000a', 'owner@test.local');

do $$
declare v_ws uuid; v_proj uuid; v_task uuid; v_inv_member text; v_inv_client text;
begin
  v_ws := public.create_workspace('RLS Test WS');
  insert into public.projects (workspace_id, name, created_by)
  values (v_ws, 'Proj', auth.uid()) returning id into v_proj;
  insert into public.tasks (project_id, workspace_id, title, created_by, assignee_id)
  values (v_proj, v_ws, 'Owner task', auth.uid(), auth.uid()) returning id into v_task;
  insert into public.ideas (workspace_id, title, created_by)
  values (v_ws, 'Owner idea', auth.uid());

  v_inv_member := public.create_invite(v_ws, 'member@test.local', 'member');
  v_inv_client := public.create_invite(v_ws, 'client@test.local', 'client');

  perform set_config('test.ws', v_ws::text, false);
  perform set_config('test.task', v_task::text, false);
  perform set_config('test.inv_member', v_inv_member, false);
  perform set_config('test.inv_client', v_inv_client, false);
end $$;

-- --- member + client accept their invites ----------------------------------
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000b', 'member@test.local');
select public.accept_invite(current_setting('test.inv_member'));
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000c', 'client@test.local');
select public.accept_invite(current_setting('test.inv_client'));

-- --- CHECK 1: outsider sees nothing ----------------------------------------
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000d', 'outsider@test.local');
do $$
begin
  if exists (select 1 from public.workspaces) then raise exception 'FAIL: outsider can see workspaces'; end if;
  if exists (select 1 from public.projects)   then raise exception 'FAIL: outsider can see projects'; end if;
  if exists (select 1 from public.tasks)      then raise exception 'FAIL: outsider can see tasks'; end if;
  if exists (select 1 from public.ideas)      then raise exception 'FAIL: outsider can see ideas'; end if;
  raise notice 'PASS: cross-workspace isolation (outsider sees 0 rows)';
end $$;

-- --- CHECK 2: member cannot update another member''s task -------------------
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000b', 'member@test.local');
do $$
declare v_count int;
begin
  update public.tasks set title = 'hacked'
  where id = current_setting('test.task')::uuid;
  get diagnostics v_count = row_count;
  if v_count > 0 then raise exception 'FAIL: member updated someone else''s task'; end if;
  raise notice 'PASS: member cannot update another''s task';
end $$;

-- --- CHECK 3: member cannot escalate their own role ------------------------
do $$
declare v_count int;
begin
  update public.workspace_members set role = 'owner'
  where user_id = auth.uid();
  get diagnostics v_count = row_count;
  if v_count > 0 then raise exception 'FAIL: member escalated own role by direct update'; end if;

  begin
    perform public.change_member_role(current_setting('test.ws')::uuid,
      '00000000-0000-0000-0000-00000000000b', 'owner');
    raise exception 'FAIL: member called change_member_role on self';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  raise notice 'PASS: privilege escalation blocked';
end $$;

-- --- CHECK 4: client is read-only and sees no internals --------------------
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000c', 'client@test.local');
do $$
declare v_count int;
begin
  if not exists (select 1 from public.projects) then
    raise exception 'FAIL: client should SEE projects';
  end if;
  if exists (select 1 from public.ideas) then raise exception 'FAIL: client can see internal ideas'; end if;
  if exists (select 1 from public.meetings) then raise exception 'FAIL: client can see internal meetings'; end if;

  begin
    insert into public.tasks (project_id, workspace_id, title, created_by)
    select id, workspace_id, 'client task', auth.uid() from public.projects limit 1;
    raise exception 'FAIL: client INSERTed a task';
  exception when insufficient_privilege or check_violation then null;
           when others then if sqlerrm like 'FAIL%' then raise; end if;
  end;

  update public.tasks set title = 'client edit';
  get diagnostics v_count = row_count;
  if v_count > 0 then raise exception 'FAIL: client updated a task'; end if;

  raise notice 'PASS: client role is read-only, internals hidden';
end $$;

-- --- CHECK 5: anon sees nothing ---------------------------------------------
select set_config('role', 'anon', true);
do $$
begin
  if exists (select 1 from public.workspaces) then raise exception 'FAIL: anon sees workspaces'; end if;
  if exists (select 1 from public.tasks) then raise exception 'FAIL: anon sees tasks'; end if;
  if exists (select 1 from public.profiles) then raise exception 'FAIL: anon sees profiles'; end if;
  raise notice 'PASS: anon role sees nothing';
end $$;

select pg_temp.reset_role();
select 'ALL RLS CHECKS PASSED — transaction will now roll back, no data kept' as result;

rollback;
