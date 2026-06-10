-- Kagu Team — 0001_schema.sql
-- Tables, enums, constraints. Run FIRST in the Supabase SQL editor.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.member_role as enum ('owner', 'admin', 'member', 'client');
create type public.project_status as enum ('planning', 'active', 'on_hold', 'completed');
create type public.task_status as enum ('todo', 'in_progress', 'review', 'done');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.idea_status as enum ('proposed', 'under_review', 'approved', 'rejected');
create type public.rsvp_status as enum ('pending', 'yes', 'no', 'maybe');
create type public.notification_type as enum (
  'task_assigned', 'meeting_invite', 'rsvp_change', 'idea_status', 'member_joined'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 1000),
  expo_push_token text check (expo_push_token is null or char_length(expo_push_token) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (char_length(email) between 3 and 254 and position('@' in email) > 1),
  role public.member_role not null default 'member' check (role <> 'owner'),
  token_hash text not null unique,
  invited_by uuid references public.profiles (id) on delete cascade,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 5000),
  color text not null default '#3b66f6' check (color ~ '^#[0-9a-fA-F]{6}$'),
  status public.project_status not null default 'planning',
  start_date date,
  end_date date check (end_date is null or start_date is null or end_date >= start_date),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  -- denormalized from projects for fast, recursion-free RLS; kept correct by trigger
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 10000),
  assignee_id uuid references public.profiles (id) on delete set null,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  start_date date,
  due_date date check (due_date is null or start_date is null or due_date >= start_date),
  depends_on uuid references public.tasks (id) on delete set null,
  sort_order int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (depends_on is null or depends_on <> id)
);
create index tasks_project_idx on public.tasks (project_id);
create index tasks_workspace_idx on public.tasks (workspace_id);
create index tasks_assignee_idx on public.tasks (assignee_id);

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  pitch text not null default '' check (char_length(pitch) <= 10000),
  status public.idea_status not null default 'proposed',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ideas_workspace_idx on public.ideas (workspace_id);

create table public.idea_votes (
  idea_id uuid not null references public.ideas (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

create table public.idea_comments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index idea_comments_idea_idx on public.idea_comments (idea_id);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  agenda text not null default '' check (char_length(agenda) <= 10000),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  location text not null default '' check (char_length(location) <= 500),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index meetings_workspace_idx on public.meetings (workspace_id, starts_at);

create table public.meeting_attendees (
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rsvp public.rsvp_status not null default 'pending',
  created_at timestamptz not null default now(),
  primary key (meeting_id, user_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  type public.notification_type not null,
  title text not null check (char_length(title) <= 200),
  body text not null default '' check (char_length(body) <= 1000),
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
