-- Kagu Team — 0003_rls.sql
-- Row-Level Security: default-deny, per-operation policies. Run THIRD.
--
-- Role model per workspace:
--   owner/admin : manage members/invites, projects, meetings, idea statuses
--   member      : work on tasks, propose/vote/comment ideas, RSVP
--   client      : read-only window into projects/tasks/Gantt (no internal
--                 ideas/meetings, no writes anywhere)

alter table public.profiles          enable row level security;
alter table public.workspaces        enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invites           enable row level security;
alter table public.projects          enable row level security;
alter table public.tasks             enable row level security;
alter table public.ideas             enable row level security;
alter table public.idea_votes        enable row level security;
alter table public.idea_comments     enable row level security;
alter table public.meetings          enable row level security;
alter table public.meeting_attendees enable row level security;
alter table public.notifications     enable row level security;

-- belt and braces: even table owners go through policies unless superuser
alter table public.workspace_members force row level security;
alter table public.invites force row level security;

-- ---------------------------------------------------------------------------
-- profiles: see yourself + people you share a workspace with; edit only you
-- ---------------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace_with(id));

create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- inserts happen via the on_auth_user_created trigger; allow self-repair too
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- workspaces: visible to members; created only via create_workspace() RPC;
-- renamed by admins+; deleted by owners
-- ---------------------------------------------------------------------------
create policy workspaces_select on public.workspaces for select to authenticated
  using (public.is_member(id));

create policy workspaces_update on public.workspaces for update to authenticated
  using (public.member_role(id) in ('owner', 'admin'))
  with check (public.member_role(id) in ('owner', 'admin'));

create policy workspaces_delete on public.workspaces for delete to authenticated
  using (public.member_role(id) = 'owner');

-- ---------------------------------------------------------------------------
-- workspace_members: readable by fellow members. NO direct writes — all
-- mutations go through SECURITY DEFINER RPCs (0002), which is what blocks
-- privilege escalation.
-- ---------------------------------------------------------------------------
create policy members_select on public.workspace_members for select to authenticated
  using (public.is_member(workspace_id));

-- ---------------------------------------------------------------------------
-- invites: admins+ can list/see; creation/acceptance/revocation via RPCs only
-- (token_hash is visible only to admins and is a SHA-256 digest, not the token)
-- ---------------------------------------------------------------------------
create policy invites_select on public.invites for select to authenticated
  using (public.member_role(workspace_id) in ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create policy projects_select on public.projects for select to authenticated
  using (public.is_member(workspace_id));

create policy projects_insert on public.projects for insert to authenticated
  with check (
    public.member_role(workspace_id) in ('owner', 'admin')
    and created_by = (select auth.uid())
  );

create policy projects_update on public.projects for update to authenticated
  using (public.member_role(workspace_id) in ('owner', 'admin'))
  with check (public.member_role(workspace_id) in ('owner', 'admin'));

create policy projects_delete on public.projects for delete to authenticated
  using (public.member_role(workspace_id) in ('owner', 'admin'));

-- ---------------------------------------------------------------------------
-- tasks: clients read-only; members manage their own; admins manage all
-- ---------------------------------------------------------------------------
create policy tasks_select on public.tasks for select to authenticated
  using (public.is_member(workspace_id));

create policy tasks_insert on public.tasks for insert to authenticated
  with check (
    public.member_role(workspace_id) in ('owner', 'admin', 'member')
    and created_by = (select auth.uid())
  );

create policy tasks_update on public.tasks for update to authenticated
  using (
    public.member_role(workspace_id) in ('owner', 'admin')
    or (
      public.member_role(workspace_id) = 'member'
      and (assignee_id = (select auth.uid()) or created_by = (select auth.uid()))
    )
  )
  with check (public.member_role(workspace_id) in ('owner', 'admin', 'member'));

create policy tasks_delete on public.tasks for delete to authenticated
  using (
    public.member_role(workspace_id) in ('owner', 'admin')
    or (public.member_role(workspace_id) = 'member' and created_by = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- ideas: internal — clients excluded entirely
-- ---------------------------------------------------------------------------
create policy ideas_select on public.ideas for select to authenticated
  using (public.member_role(workspace_id) in ('owner', 'admin', 'member'));

create policy ideas_insert on public.ideas for insert to authenticated
  with check (
    public.member_role(workspace_id) in ('owner', 'admin', 'member')
    and created_by = (select auth.uid())
    and status = 'proposed'
  );

-- author edits text; admins+ also change status (enforced by ideas_guard trigger)
create policy ideas_update on public.ideas for update to authenticated
  using (
    public.member_role(workspace_id) in ('owner', 'admin')
    or (public.member_role(workspace_id) = 'member' and created_by = (select auth.uid()))
  )
  with check (public.member_role(workspace_id) in ('owner', 'admin', 'member'));

create policy ideas_delete on public.ideas for delete to authenticated
  using (
    public.member_role(workspace_id) in ('owner', 'admin')
    or (public.member_role(workspace_id) = 'member' and created_by = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- idea_votes: one per user, self-managed
-- ---------------------------------------------------------------------------
create policy idea_votes_select on public.idea_votes for select to authenticated
  using (exists (
    select 1 from public.ideas i
    where i.id = idea_id
      and public.member_role(i.workspace_id) in ('owner', 'admin', 'member')
  ));

create policy idea_votes_insert on public.idea_votes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.ideas i
      where i.id = idea_id
        and public.member_role(i.workspace_id) in ('owner', 'admin', 'member')
    )
  );

create policy idea_votes_delete on public.idea_votes for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- idea_comments
-- ---------------------------------------------------------------------------
create policy idea_comments_select on public.idea_comments for select to authenticated
  using (exists (
    select 1 from public.ideas i
    where i.id = idea_id
      and public.member_role(i.workspace_id) in ('owner', 'admin', 'member')
  ));

create policy idea_comments_insert on public.idea_comments for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.ideas i
      where i.id = idea_id
        and public.member_role(i.workspace_id) in ('owner', 'admin', 'member')
    )
  );

create policy idea_comments_delete on public.idea_comments for delete to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.ideas i
      where i.id = idea_id and public.member_role(i.workspace_id) in ('owner', 'admin')
    )
  );

-- ---------------------------------------------------------------------------
-- meetings: internal — clients excluded; admins+ create/manage
-- ---------------------------------------------------------------------------
create policy meetings_select on public.meetings for select to authenticated
  using (public.member_role(workspace_id) in ('owner', 'admin', 'member'));

create policy meetings_insert on public.meetings for insert to authenticated
  with check (
    public.member_role(workspace_id) in ('owner', 'admin')
    and created_by = (select auth.uid())
  );

create policy meetings_update on public.meetings for update to authenticated
  using (
    public.member_role(workspace_id) in ('owner', 'admin')
    or created_by = (select auth.uid())
  )
  with check (public.member_role(workspace_id) in ('owner', 'admin', 'member'));

create policy meetings_delete on public.meetings for delete to authenticated
  using (
    public.member_role(workspace_id) in ('owner', 'admin')
    or created_by = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- meeting_attendees: organizers manage the list; attendees flip their own
-- RSVP (column immutability enforced by attendees_guard trigger)
-- ---------------------------------------------------------------------------
create policy attendees_select on public.meeting_attendees for select to authenticated
  using (exists (
    select 1 from public.meetings m
    where m.id = meeting_id
      and public.member_role(m.workspace_id) in ('owner', 'admin', 'member')
  ));

create policy attendees_insert on public.meeting_attendees for insert to authenticated
  with check (exists (
    select 1 from public.meetings m
    where m.id = meeting_id
      and (
        public.member_role(m.workspace_id) in ('owner', 'admin')
        or m.created_by = (select auth.uid())
      )
  ));

create policy attendees_update on public.meeting_attendees for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy attendees_delete on public.meeting_attendees for delete to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.meetings m
      where m.id = meeting_id
        and (
          public.member_role(m.workspace_id) in ('owner', 'admin')
          or m.created_by = (select auth.uid())
        )
    )
  );

-- ---------------------------------------------------------------------------
-- notifications: strictly your own inbox; rows are written only by
-- SECURITY DEFINER triggers/RPCs (no insert policy on purpose)
-- ---------------------------------------------------------------------------
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_update on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));
