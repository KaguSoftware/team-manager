import * as ExpoLinking from "expo-linking";
import { supabase } from "./supabase";

// Stable deep link used in auth emails (confirm signup, password recovery).
// Works in production/dev-client builds where the kaguteam:// scheme is
// registered. In Expo Go the scheme isn't registered, so after tapping an
// email link the user just returns to the app manually — the verification
// itself has already happened on Supabase's servers by then.
export const AUTH_REDIRECT_URL = "kaguteam://auth/callback";

function paramsFrom(url: string): Record<string, string> {
  // Supabase returns tokens in the URL fragment (#access_token=...&...) or
  // errors/codes in the query string; merge both.
  const out: Record<string, string> = {};
  for (const part of url.split(/[#?]/).slice(1)) {
    for (const kv of part.split("&")) {
      const [k, v] = kv.split("=");
      if (k && v !== undefined) out[decodeURIComponent(k)] = decodeURIComponent(v);
    }
  }
  return out;
}

/**
 * If the URL is a Supabase auth callback, install the session it carries.
 * Returns the auth event type ("signup" | "recovery" | ...) or null.
 */
export async function handleAuthUrl(url: string | null): Promise<string | null> {
  if (!url || !url.includes("auth/callback")) return null;
  const params = paramsFrom(url);

  if (params.access_token && params.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) return null;
    return params.type ?? "signup";
  }
  return null;
}

export function subscribeToAuthLinks(onEvent: (type: string) => void) {
  ExpoLinking.getInitialURL().then((url) =>
    handleAuthUrl(url).then((t) => t && onEvent(t)),
  );
  const sub = ExpoLinking.addEventListener("url", ({ url }) =>
    handleAuthUrl(url).then((t) => t && onEvent(t)),
  );
  return () => sub.remove();
}
