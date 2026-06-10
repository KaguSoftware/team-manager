-- Kagu Team — 0002_functions.sql
-- Helper functions, security-definer RPCs, and triggers. Run SECOND.
--
-- Security notes:
-- * Every SECURITY DEFINER function pins search_path to '' and fully qualifies
--   every object, preventing search-path hijacking.
-- * Membership/role changes are ONLY possible through these RPCs; direct
--   writes to workspace_members and invites are denied by RLS (0003).

-- ---------------------------------------------------------------------------
-- Membership helpers (used inside RLS policies; definer => no RLS recursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_member(p_workspace uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members m
    where m.workspace_id = p_workspace and m.user_id = auth.uid()
  );
$$;

create or replace function public.member_role(p_workspace uuid)
returns public.member_role
language sql stable security definer set search_path = ''
as $$
  select m.role from public.workspace_members m
  where m.workspace_id = p_workspace and m.user_id = auth.uid();
$$;

-- true when the caller shares at least one workspace with p_user
create or replace function public.shares_workspace_with(p_user uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members a
    join public.workspace_members b on a.workspace_id = b.workspace_id
    where a.user_id = auth.uid() and b.user_id = p_user
  );
$$;

revoke all on function public.is_member(uuid), public.member_role(uuid),
  public.shares_workspace_with(uuid) from anon;

-- ---------------------------------------------------------------------------
-- Profile auto-creation on signup
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(left(new.raw_user_meta_data ->> 'full_name', 120), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch  before update on public.profiles  for each row execute function public.set_updated_at();
create trigger projects_touch  before update on public.projects  for each row execute function public.set_updated_at();
create trigger tasks_touch     before update on public.tasks     for each row execute function public.set_updated_at();
create trigger ideas_touch     before update on public.ideas     for each row execute function public.set_updated_at();
create trigger meetings_touch  before update on public.meetings  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Task integrity: workspace_id always mirrors the project's workspace;
-- dependencies must stay inside the same project.
-- ---------------------------------------------------------------------------
create or replace function public.tasks_integrity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_ws uuid;
  v_dep_project uuid;
begin
  select p.workspace_id into v_ws from public.projects p where p.id = new.project_id;
  if v_ws is null then
    raise exception 'project not found';
  end if;
  new.workspace_id := v_ws;

  if new.depends_on is not null then
    select t.project_id into v_dep_project from public.tasks t where t.id = new.depends_on;
    if v_dep_project is distinct from new.project_id then
      raise exception 'task dependency must belong to the same project';
    end if;
  end if;
  return new;
end;
$$;

create trigger tasks_integrity_trg
  before insert or update of project_id, workspace_id, depends_on on public.tasks
  for each row execute function public.tasks_integrity();

-- ---------------------------------------------------------------------------
-- Idea status changes are admin/owner only (other edits stay with the author)
-- ---------------------------------------------------------------------------
create or replace function public.ideas_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and public.member_role(old.workspace_id) not in ('owner', 'admin') then
    raise exception 'only owners/admins can change idea status';
  end if;
  if new.workspace_id is distinct from old.workspace_id
     or new.created_by is distinct from old.created_by then
    raise exception 'immutable idea fields';
  end if;
  return new;
end;
$$;

create trigger ideas_guard_trg
  before update on public.ideas
  for each row execute function public.ideas_guard();

-- ---------------------------------------------------------------------------
-- Attendees may only flip their own RSVP — never re-point the row
-- ---------------------------------------------------------------------------
create or replace function public.attendees_guard()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.meeting_id is distinct from old.meeting_id
     or new.user_id is distinct from old.user_id then
    raise exception 'immutable attendee fields';
  end if;
  return new;
end;
$$;

create trigger attendees_guard_trg
  before update on public.meeting_attendees
  for each row execute function public.attendees_guard();

-- ---------------------------------------------------------------------------
-- In-app notifications (definer triggers bypass RLS to write the inbox)
-- ---------------------------------------------------------------------------
create or replace function public.notify_task_assigned()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.assignee_id is not null
     and new.assignee_id <> auth.uid()
     and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id) then
    insert into public.notifications (user_id, workspace_id, type, title, body, data)
    values (
      new.assignee_id, new.workspace_id, 'task_assigned',
      'New task assigned', left(new.title, 200),
      jsonb_build_object('task_id', new.id, 'project_id', new.project_id)
    );
  end if;
  return new;
end;
$$;

create trigger notify_task_assigned_trg
  after insert or update of assignee_id on public.tasks
  for each row execute function public.notify_task_assigned();

create or replace function public.notify_meeting_invite()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_meeting public.meetings;
begin
  select * into v_meeting from public.meetings where id = new.meeting_id;
  if new.user_id <> auth.uid() then
    insert into public.notifications (user_id, workspace_id, type, title, body, data)
    values (
      new.user_id, v_meeting.workspace_id, 'meeting_invite',
      'Meeting invitation', left(v_meeting.title, 200),
      jsonb_build_object('meeting_id', new.meeting_id)
    );
  end if;
  return new;
end;
$$;

create trigger notify_meeting_invite_trg
  after insert on public.meeting_attendees
  for each row execute function public.notify_meeting_invite();

create or replace function public.notify_idea_status()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.status is distinct from old.status and new.created_by <> auth.uid() then
    insert into public.notifications (user_id, workspace_id, type, title, body, data)
    values (
      new.created_by, new.workspace_id, 'idea_status',
      'Idea ' || replace(new.status::text, '_', ' '), left(new.title, 200),
      jsonb_build_object('idea_id', new.id)
    );
  end if;
  return new;
end;
$$;

create trigger notify_idea_status_trg
  after update of status on public.ideas
  for each row execute function public.notify_idea_status();

-- ---------------------------------------------------------------------------
-- RPC: create_workspace — creator becomes owner atomically
-- ---------------------------------------------------------------------------
create or replace function public.create_workspace(p_name text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 80 then
    raise exception 'workspace name must be 1-80 characters';
  end if;

  insert into public.workspaces (name, created_by)
  values (btrim(p_name), auth.uid())
  returning id into v_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_id, auth.uid(), 'owner');

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: create_invite — admin+, single-use 72h token, stored hashed.
-- Returns the RAW token exactly once; share it with the invitee out of band.
-- ---------------------------------------------------------------------------
create or replace function public.create_invite(
  p_workspace uuid, p_email text, p_role public.member_role default 'member'
)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_raw text;
begin
  if public.member_role(p_workspace) not in ('owner', 'admin') then
    raise exception 'only owners/admins can invite';
  end if;
  if p_role = 'owner' then
    raise exception 'cannot invite as owner';
  end if;
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email';
  end if;

  v_raw := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.invites (workspace_id, email, role, token_hash, invited_by, expires_at)
  values (
    p_workspace, lower(btrim(p_email)), p_role,
    encode(extensions.digest(v_raw, 'sha256'), 'hex'),
    auth.uid(), now() + interval '72 hours'
  );

  return v_raw;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: accept_invite — token must match, be unexpired, unused, and addressed
-- to the caller's (verified) email.
-- ---------------------------------------------------------------------------
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_invite public.invites;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_invite
  from public.invites
  where token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
    and accepted_at is null
    and expires_at > now()
  for update;

  if v_invite.id is null then
    raise exception 'invite is invalid or has expired';
  end if;
  if lower(coalesce(auth.email(), '')) <> v_invite.email then
    raise exception 'this invite was issued for a different email address';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_invite.workspace_id, auth.uid(), v_invite.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.invites set accepted_at = now() where id = v_invite.id;

  insert into public.notifications (user_id, workspace_id, type, title, body, data)
  select m.user_id, v_invite.workspace_id, 'member_joined', 'New team member',
         coalesce(nullif(p.full_name, ''), v_invite.email) || ' joined the workspace',
         jsonb_build_object('user_id', auth.uid())
  from public.workspace_members m
  left join public.profiles p on p.id = auth.uid()
  where m.workspace_id = v_invite.workspace_id
    and m.role in ('owner', 'admin')
    and m.user_id <> auth.uid();

  return v_invite.workspace_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: change_member_role — escalation-proof
-- ---------------------------------------------------------------------------
create or replace function public.change_member_role(
  p_workspace uuid, p_user uuid, p_role public.member_role
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_caller public.member_role := public.member_role(p_workspace);
  v_target public.member_role;
  v_owner_count int;
begin
  if v_caller not in ('owner', 'admin') then
    raise exception 'only owners/admins can change roles';
  end if;
  if p_user = auth.uid() then
    raise exception 'you cannot change your own role';
  end if;

  select role into v_target from public.workspace_members
  where workspace_id = p_workspace and user_id = p_user;
  if v_target is null then
    raise exception 'user is not a member of this workspace';
  end if;

  -- only an owner may touch owners or mint new owners/admins
  if (v_target = 'owner' or p_role in ('owner', 'admin')) and v_caller <> 'owner' then
    raise exception 'only an owner can manage owner/admin roles';
  end if;

  if v_target = 'owner' and p_role <> 'owner' then
    select count(*) into v_owner_count from public.workspace_members
    where workspace_id = p_workspace and role = 'owner';
    if v_owner_count <= 1 then
      raise exception 'cannot demote the last owner';
    end if;
  end if;

  update public.workspace_members set role = p_role
  where workspace_id = p_workspace and user_id = p_user;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: remove_member / leave_workspace
-- ---------------------------------------------------------------------------
create or replace function public.remove_member(p_workspace uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_caller public.member_role := public.member_role(p_workspace);
  v_target public.member_role;
begin
  if v_caller not in ('owner', 'admin') then
    raise exception 'only owners/admins can remove members';
  end if;
  if p_user = auth.uid() then
    raise exception 'use leave_workspace to remove yourself';
  end if;

  select role into v_target from public.workspace_members
  where workspace_id = p_workspace and user_id = p_user;
  if v_target is null then
    raise exception 'user is not a member of this workspace';
  end if;
  if v_target = 'owner' then
    raise exception 'owners cannot be removed; transfer ownership first';
  end if;
  if v_target = 'admin' and v_caller <> 'owner' then
    raise exception 'only an owner can remove an admin';
  end if;

  delete from public.workspace_members
  where workspace_id = p_workspace and user_id = p_user;
end;
$$;

create or replace function public.leave_workspace(p_workspace uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_role public.member_role := public.member_role(p_workspace);
  v_owner_count int;
begin
  if v_role is null then
    raise exception 'not a member';
  end if;
  if v_role = 'owner' then
    select count(*) into v_owner_count from public.workspace_members
    where workspace_id = p_workspace and role = 'owner';
    if v_owner_count <= 1 then
      raise exception 'the last owner cannot leave; transfer ownership or delete the workspace';
    end if;
  end if;

  delete from public.workspace_members
  where workspace_id = p_workspace and user_id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: revoke_invite
-- ---------------------------------------------------------------------------
create or replace function public.revoke_invite(p_invite uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_ws uuid;
begin
  select workspace_id into v_ws from public.invites where id = p_invite;
  if v_ws is null then
    raise exception 'invite not found';
  end if;
  if public.member_role(v_ws) not in ('owner', 'admin') then
    raise exception 'only owners/admins can revoke invites';
  end if;
  delete from public.invites where id = p_invite;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: delete_account — full self-service wipe (Apple requirement).
-- Deleting the auth.users row cascades profiles, memberships, votes,
-- attendance, comments, notifications; authored content in shared workspaces
-- survives with created_by set null (FKs in 0001).
-- ---------------------------------------------------------------------------
create or replace function public.delete_account()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_orphan uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- refuse if the user is the last owner of any workspace that still has
  -- other members — they must transfer ownership first
  if exists (
    select 1 from public.workspace_members m
    where m.user_id = v_uid and m.role = 'owner'
      and (select count(*) from public.workspace_members o
           where o.workspace_id = m.workspace_id and o.role = 'owner') = 1
      and (select count(*) from public.workspace_members x
           where x.workspace_id = m.workspace_id) > 1
  ) then
    raise exception 'transfer ownership of your workspaces before deleting your account';
  end if;

  -- delete solo workspaces they own (cascades projects/tasks/ideas/meetings)
  for v_orphan in
    select m.workspace_id from public.workspace_members m
    where m.user_id = v_uid and m.role = 'owner'
      and (select count(*) from public.workspace_members x
           where x.workspace_id = m.workspace_id) = 1
  loop
    delete from public.workspaces where id = v_orphan;
  end loop;

  delete from auth.users where id = v_uid;
end;
$$;

revoke execute on function
  public.create_workspace(text),
  public.create_invite(uuid, text, public.member_role),
  public.accept_invite(text),
  public.change_member_role(uuid, uuid, public.member_role),
  public.remove_member(uuid, uuid),
  public.leave_workspace(uuid),
  public.revoke_invite(uuid),
  public.delete_account()
from anon;
