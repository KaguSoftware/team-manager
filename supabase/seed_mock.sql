-- Kagu Team — mock data seeder (DEV ONLY)
-- Run in the Supabase SQL editor. Idempotent-ish: re-running adds more tasks/
-- notifications but reuses the mock teammates and your workspace.
--
-- 1. Set v_email below to the email you log into the app with.
-- 2. Run the whole file.
-- It fills: 3 teammates, 4 projects, ~40 tasks (open/overdue/done across the
-- last 14 days for the charts), 6 ideas with votes + comments, 4 meetings with
-- RSVPs, and a batch of notifications (with real deep-link ids).

do $$
declare
  v_email   text := 'parsaxavier@gmail.com';   -- <<< CHANGE ME to your login email
  v_me      uuid;
  v_ws      uuid;
  v_alice   uuid;
  v_bob     uuid;
  v_carol   uuid;
  v_p1 uuid; v_p2 uuid; v_p3 uuid; v_p4 uuid;
  v_today date := current_date;
  rec record;
begin
  select id into v_me from auth.users where lower(email) = lower(v_email);
  if v_me is null then
    raise exception 'No auth user found for %. Sign up in the app first, then set v_email.', v_email;
  end if;

  -- a workspace you belong to (create one if you have none yet)
  select workspace_id into v_ws
  from public.workspace_members where user_id = v_me order by created_at limit 1;
  if v_ws is null then
    insert into public.workspaces (name, created_by) values ('Kagu HQ', v_me) returning id into v_ws;
    insert into public.workspace_members (workspace_id, user_id, role) values (v_ws, v_me, 'owner');
  end if;
  update public.profiles set full_name = coalesce(nullif(full_name, ''), 'Parsa') where id = v_me;

  -- teammates: create the auth user if missing (the on_auth_user_created
  -- trigger makes the profile), then pin the display name.
  for rec in
    select * from (values
      ('alice.kagu@example.com', 'Alice Rivera'),
      ('bob.kagu@example.com',   'Bob Chen'),
      ('carol.kagu@example.com', 'Carol Diaz')
    ) as t(mail, nm)
  loop
    if not exists (select 1 from auth.users where lower(email) = lower(rec.mail)) then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
        'authenticated', 'authenticated', lower(rec.mail),
        extensions.crypt('Password123!', extensions.gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', rec.nm),
        '', '', '', ''
      );
    end if;
    update public.profiles set full_name = rec.nm
    where id = (select id from auth.users where lower(email) = lower(rec.mail));
  end loop;

  select id into v_alice from auth.users where lower(email) = 'alice.kagu@example.com';
  select id into v_bob   from auth.users where lower(email) = 'bob.kagu@example.com';
  select id into v_carol from auth.users where lower(email) = 'carol.kagu@example.com';

  insert into public.workspace_members (workspace_id, user_id, role) values
    (v_ws, v_alice, 'admin'),
    (v_ws, v_bob,   'member'),
    (v_ws, v_carol, 'client')
  on conflict (workspace_id, user_id) do nothing;

  -- projects
  insert into public.projects (workspace_id, name, description, color, status, start_date, end_date, created_by)
  values (v_ws, 'Mobile App Launch', 'Ship Kagu Team v1 to the App Store and Play Store.', '#64748b', 'active',   v_today - 20, v_today + 25, v_me) returning id into v_p1;
  insert into public.projects (workspace_id, name, description, color, status, start_date, end_date, created_by)
  values (v_ws, 'Website Redesign',  'Marketing site refresh with the new brand.',          '#0d9488', 'planning', v_today + 3,  v_today + 40, v_me) returning id into v_p2;
  insert into public.projects (workspace_id, name, description, color, status, start_date, end_date, created_by)
  values (v_ws, 'Q3 Marketing',      'Launch campaign, content calendar, and ads.',         '#9333ea', 'active',   v_today - 10, v_today + 30, v_me) returning id into v_p3;
  insert into public.projects (workspace_id, name, description, color, status, start_date, end_date, created_by)
  values (v_ws, 'Internal Tools',    'Admin dashboard and ops automation.',                 '#d97706', 'on_hold',  v_today - 30, v_today + 10, v_me) returning id into v_p4;

  -- open / in-progress / review tasks with assignees + date ranges (Gantt + board)
  insert into public.tasks (project_id, workspace_id, title, description, status, priority, assignee_id, start_date, due_date, sort_order, created_by) values
    (v_p1, v_ws, 'Design onboarding flow',     'Figma screens for first-run.',      'in_progress', 'high',   v_alice, v_today - 3, v_today + 2,  1, v_me),
    (v_p1, v_ws, 'Wire up push notifications',  'Expo + edge function.',            'review',      'medium', v_bob,   v_today - 5, v_today + 1,  2, v_me),
    (v_p1, v_ws, 'App Store screenshots',       'All device sizes.',                'todo',        'medium', v_me,    v_today + 1, v_today + 6,  3, v_me),
    (v_p1, v_ws, 'Fix overdue sync bug',        'Tasks not refreshing.',            'in_progress', 'urgent', v_alice, v_today - 8, v_today - 1,  4, v_me),
    (v_p2, v_ws, 'Audit current pages',         'Inventory + analytics.',           'todo',        'low',    v_carol, v_today + 3, v_today + 8,  1, v_me),
    (v_p2, v_ws, 'New hero section',            'Above-the-fold redesign.',         'todo',        'high',   v_alice, v_today + 5, v_today + 12, 2, v_me),
    (v_p3, v_ws, 'Content calendar',            'Posts for the next 8 weeks.',      'in_progress', 'medium', v_bob,   v_today - 4, v_today + 3,  1, v_me),
    (v_p3, v_ws, 'Launch email',                'Announcement to the list.',        'review',      'high',   v_me,    v_today - 2, v_today,      2, v_me),
    (v_p3, v_ws, 'Ad creatives',                'Static + video variants.',         'todo',        'medium', v_carol, v_today + 2, v_today + 9,  3, v_me),
    (v_p4, v_ws, 'Role management UI',          'Owner/admin controls.',            'todo',        'low',    v_bob,   v_today - 6, v_today + 4,  1, v_me),
    (v_p4, v_ws, 'Export to CSV',               'Reports download.',                'in_progress', 'low',    v_alice, v_today - 1, v_today + 7,  2, v_me);

  -- ~28 completed tasks spread across the last 14 days (feeds the bar chart),
  -- 2 per day, with varied priority and assignee
  insert into public.tasks (project_id, workspace_id, title, status, priority, assignee_id, created_at, updated_at, created_by)
  select
    (array[v_p1, v_p2, v_p3, v_p4])[1 + floor(random() * 4)::int],
    v_ws,
    'Done: ' || (array['polish','refactor','review','ship','test','spec'])[1 + floor(random() * 6)::int] || ' #' || g || '-' || k,
    'done',
    (array['low','medium','high','urgent']::public.task_priority[])[1 + floor(random() * 4)::int],
    (array[v_me, v_alice, v_bob])[1 + floor(random() * 3)::int],
    now() - ((g) || ' days')::interval - interval '6 hours',
    now() - ((g) || ' days')::interval,
    v_me
  from generate_series(0, 13) g, generate_series(1, 2) k;

  -- ideas
  insert into public.ideas (workspace_id, title, pitch, status, created_by) values
    (v_ws, 'Dark mode polish',          'Tune contrast across every screen.',                  'approved',     v_alice),
    (v_ws, 'Slack integration',         'Post task + meeting updates to a channel.',           'under_review', v_bob),
    (v_ws, 'Recurring meetings',        'Weekly/biweekly repeat with auto-RSVP.',              'proposed',     v_me),
    (v_ws, 'Time tracking',             'Log hours per task for billing.',                     'proposed',     v_carol),
    (v_ws, 'AI standup summary',        'Summarize the day''s task changes each evening.',     'under_review', v_alice),
    (v_ws, 'Public roadmap',            'Share approved ideas with clients read-only.',        'rejected',     v_bob);

  -- votes: each user votes on ~60% of this workspace's ideas
  insert into public.idea_votes (idea_id, user_id)
  select i.id, u
  from public.ideas i
  cross join unnest(array[v_me, v_alice, v_bob, v_carol]) u
  where i.workspace_id = v_ws and random() < 0.6
  on conflict (idea_id, user_id) do nothing;

  -- a couple of comments per idea
  insert into public.idea_comments (idea_id, body, created_by)
  select i.id,
    (array['Love this — high impact.','What''s the rough effort?','+1, would use daily.','Let''s scope it for next quarter.'])[1 + floor(random() * 4)::int],
    (array[v_me, v_alice, v_bob])[1 + floor(random() * 3)::int]
  from public.ideas i, generate_series(1, 2)
  where i.workspace_id = v_ws;

  -- meetings (one today so the Home "today" section + stat populate)
  insert into public.meetings (workspace_id, title, agenda, starts_at, ends_at, location, created_by) values
    (v_ws, 'Daily standup',     'What did you do / will you do / blockers.', date_trunc('day', now()) + interval '10 hours',     date_trunc('day', now()) + interval '10 hours 15 minutes', 'Zoom',           v_me),
    (v_ws, 'Launch planning',   'Go-to-market checklist.',                   date_trunc('day', now()) + interval '15 hours',     date_trunc('day', now()) + interval '16 hours',            'Conf Room A',    v_me),
    (v_ws, 'Design review',     'Walk through onboarding screens.',          now() + interval '2 days' + interval '3 hours',     now() + interval '2 days' + interval '4 hours',            'https://meet.google.com/abc', v_me),
    (v_ws, 'Retro',             'What went well, what to improve.',          now() - interval '3 days',                          now() - interval '3 days' + interval '45 minutes',         'Zoom',           v_me);

  -- attendees + RSVPs for everyone
  insert into public.meeting_attendees (meeting_id, user_id, rsvp)
  select m.id, u.uid,
    (array['yes','yes','maybe','no','pending']::public.rsvp_status[])[1 + floor(random() * 5)::int]
  from public.meetings m
  cross join (select unnest(array[v_me, v_alice, v_bob, v_carol]) uid) u
  where m.workspace_id = v_ws
  on conflict (meeting_id, user_id) do nothing;
  -- make sure you have a clear RSVP on today's standup
  update public.meeting_attendees set rsvp = 'yes'
  where user_id = v_me
    and meeting_id in (select id from public.meetings where workspace_id = v_ws and title = 'Daily standup');

  -- notifications for you, with real ids so the deep links work (some unread)
  insert into public.notifications (user_id, workspace_id, type, title, body, data, read_at)
  select v_me, v_ws, 'task_assigned', 'New task assigned', t.title,
         jsonb_build_object('task_id', t.id, 'project_id', t.project_id), null
  from public.tasks t where t.workspace_id = v_ws and t.status <> 'done' order by t.created_at desc limit 1;

  insert into public.notifications (user_id, workspace_id, type, title, body, data, read_at)
  select v_me, v_ws, 'meeting_invite', 'Meeting invitation', m.title,
         jsonb_build_object('meeting_id', m.id), null
  from public.meetings m where m.workspace_id = v_ws order by m.starts_at desc limit 1;

  insert into public.notifications (user_id, workspace_id, type, title, body, data, read_at)
  select v_me, v_ws, 'idea_status', 'Idea approved', i.title,
         jsonb_build_object('idea_id', i.id), now() - interval '1 day'
  from public.ideas i where i.workspace_id = v_ws and i.status = 'approved' limit 1;

  insert into public.notifications (user_id, workspace_id, type, title, body, data, read_at)
  values
    (v_me, v_ws, 'member_joined', 'New team member', 'Alice Rivera joined the workspace',
     jsonb_build_object('user_id', v_alice), null),
    (v_me, v_ws, 'rsvp_change', 'RSVP updated', 'Bob Chen responded to Launch planning',
     '{}'::jsonb, now() - interval '2 hours');

  raise notice 'Seeded workspace % for % (alice=%, bob=%, carol=%)', v_ws, v_email, v_alice, v_bob, v_carol;
end;
$$;
