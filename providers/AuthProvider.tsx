import type { Session } from "@supabase/supabase-js";
import { router } from "expo-router";
import { createContext, useContext, useEffect, useState } from "react";
import { subscribeToAuthLinks } from "@/lib/authLinks";
import { supabase } from "@/lib/supabase";

type AuthState = {
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ session: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setState({ session: data.session, loading: false });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ session, loading: false });
    });
    // auth deep links from confirmation / password-recovery emails
    const unsubscribeLinks = subscribeToAuthLinks((type) => {
      if (type === "recovery") router.push("/reset-password");
    });
    return () => {
      sub.subscription.unsubscribe();
      unsubscribeLinks();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useUserId() {
  const { session } = useAuth();
  return session?.user.id ?? null;
}
