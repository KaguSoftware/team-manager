-- Allow authors to edit their own idea comments.
create policy idea_comments_update on public.idea_comments
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));
