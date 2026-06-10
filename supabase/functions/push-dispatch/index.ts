// Kagu Team — push-dispatch Edge Function
// Triggered by a Database Webhook on INSERT into public.notifications.
// Looks up the recipient's Expo push token and forwards the notification.
//
// Deploy:   supabase functions deploy push-dispatch
// Wire up:  Dashboard -> Database -> Webhooks -> new webhook on
//           public.notifications INSERT -> "Supabase Edge Function" -> push-dispatch
//
// Security: the webhook calls this function with the project's service-role
// authorization header (configure the webhook to send it). We additionally
// verify the shared secret so random internet calls are rejected even if the
// function URL leaks. Set it with:
//   supabase secrets set PUSH_WEBHOOK_SECRET=<long random string>
// and add header  x-webhook-secret: <same value>  on the webhook.

import { createClient } from "jsr:@supabase/supabase-js@2";

type WebhookPayload = {
  type: "INSERT";
  table: string;
  record: {
    id: string;
    user_id: string;
    title: string;
    body: string;
    data: Record<string, unknown>;
  };
};

Deno.serve(async (req) => {
  const secret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return new Response("forbidden", { status: 403 });
  }

  const payload = (await req.json()) as WebhookPayload;
  if (payload.type !== "INSERT" || payload.table !== "notifications") {
    return new Response("ignored", { status: 200 });
  }

  // service-role client: runs server-side only, never shipped to the app
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: profile } = await admin
    .from("profiles")
    .select("expo_push_token")
    .eq("id", payload.record.user_id)
    .single();

  const token = profile?.expo_push_token;
  if (!token || !token.startsWith("ExponentPushToken")) {
    return new Response("no token", { status: 200 });
  }

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      to: token,
      title: payload.record.title,
      body: payload.record.body,
      data: payload.record.data,
      sound: "default",
    }),
  });

  return new Response(await res.text(), { status: res.ok ? 200 : 502 });
});
