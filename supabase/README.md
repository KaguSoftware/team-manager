# Kagu Team — Supabase setup

Everything the backend needs, runnable in any Supabase account. No service-role
key is ever used by the mobile app — the app ships only the anon key, and
Row-Level Security is the access gate.

## 1. Create a project

Create a new project at https://supabase.com/dashboard (free tier is fine).

## 2. Run the migrations (in order!)

Open **SQL Editor** and run each file completely, in this order:

1. `migrations/0001_schema.sql` — tables, enums, constraints
2. `migrations/0002_functions.sql` — helpers, security RPCs, triggers
3. `migrations/0003_rls.sql` — Row-Level Security policies
4. `migrations/0004_storage.sql` — private avatars bucket + policies

## 3. Verify security (do not skip)

Run `tests/rls_checks.sql` in the SQL editor. It creates throwaway users,
exercises the whole permission model (outsider isolation, member limits,
privilege-escalation attempts, client read-only, anon blindness), prints
`PASS` notices, and **rolls everything back** — no data is kept.

If any check raises `FAIL: ...`, stop and fix before going further.

Also open **Advisors → Security Advisor** in the dashboard and confirm there
are no RLS warnings.

## 4. Auth settings (Dashboard → Authentication)

- **Sign In / Up → Email**: leave "Confirm email" **ON** (required — invite
  acceptance trusts the account email).
- **Passwords**: set minimum length to **12** and enable
  **"Prevent use of leaked passwords"** (HaveIBeenPwned screening).
- **Multi-Factor (TOTP)**: enabled by default; the app offers enrolment in
  Settings.
- (Optional) tighten rate limits under Authentication → Rate Limits.

## 4b. URL configuration (fixes the "localhost:3000" page after email links)

Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `kaguteam://auth/callback`
- **Redirect URLs**: add `kaguteam://*`

The app sends `emailRedirectTo` / `redirectTo: kaguteam://auth/callback` on
sign-up and password-reset emails. In production/dev-client builds, tapping
the email link bounces straight back into the app (and password-recovery
links open the in-app "choose a new password" screen). In **Expo Go** the
custom scheme isn't registered, so the link can't reopen the app — but the
verification has already happened server-side by the time the browser opens;
just return to the app and sign in.

## 4c. Social login providers (Google + Apple)

Dashboard → **Authentication → Sign In / Providers**:

**Apple** (native flow via `signInWithIdToken`):
1. Enable the Apple provider.
2. In **Client IDs**, add the app bundle ID: `com.kagu.team`.
3. No secret needed for the native iOS flow. (Requires the Sign in with
   Apple capability on the App ID — EAS sets this up from
   `ios.usesAppleSignIn` in app.json.)
4. Note: the Apple button only renders on iOS devices; it does not work in
   Expo Go on Android (by design).

**Google** (browser OAuth flow):
1. In Google Cloud Console → APIs & Services → Credentials, create an
   **OAuth client ID** of type **Web application**.
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
2. Enable the Google provider in Supabase and paste the **Client ID** and
   **Client secret**.
3. The app opens the Google consent page in a secure in-app browser and
   returns via `kaguteam://auth/callback` (already allowlisted in 4b) — so
   Google sign-in only completes in production/dev-client builds, not Expo Go.

App Store note: because the app offers Google sign-in, Apple **requires**
Sign in with Apple to also be offered (guideline 4.8) — both ship together.

## 5. App configuration

Copy `.env.example` (repo root) to `.env` and fill in from
**Settings → API**:

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

## 6. Push notifications (optional until Phase 7 testing)

1. `supabase functions deploy push-dispatch` (with the CLI linked to your
   project), or paste `functions/push-dispatch/index.ts` into a new function
   in the dashboard.
2. `supabase secrets set PUSH_WEBHOOK_SECRET=<long random string>`
3. Dashboard → **Database → Webhooks** → create webhook:
   - table `public.notifications`, event **INSERT**
   - type **Supabase Edge Function** → `push-dispatch`
   - add HTTP header `x-webhook-secret: <same random string>`

In-app notifications work without any of this; the webhook only adds the
device push delivery.

## Security model recap

| Role   | Can do |
|--------|--------|
| owner  | everything; only owners manage owners/admins; last owner is undeletable/undemotable |
| admin  | manage members (below admin), invites, projects, meetings, idea statuses |
| member | tasks (own/assigned), propose & vote & comment ideas, RSVP |
| client | read-only view of projects/tasks/Gantt; ideas & meetings are invisible; cannot write anything |

Hard rules enforced in SQL (not just the app):

- `workspace_members` and `invites` accept **no direct writes** — only the
  SECURITY DEFINER RPCs (`create_workspace`, `create_invite`, `accept_invite`,
  `change_member_role`, `remove_member`, `leave_workspace`, `revoke_invite`)
  can mutate them, and each RPC re-checks the caller's role server-side.
- Invite tokens are 32 random bytes, stored **SHA-256-hashed**, single-use,
  expire after 72h, and only redeemable by the invited email address.
- Idea status changes and RSVP row re-pointing are blocked by triggers even
  where an UPDATE policy passes.
- `delete_account()` provides full self-service account deletion (App Store
  requirement); it refuses while the user is the last owner of a shared
  workspace.

Note on the `client` role: a client sees every project in the workspace they
were invited to — the intended pattern is one dedicated workspace per client
engagement.
