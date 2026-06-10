import { Redirect } from "expo-router";
import { Loading } from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";
import { useWorkspaceStore } from "@/stores/workspace";

export default function Index() {
  const { session, loading } = useAuth();
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);

  if (loading) return <Loading />;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!workspaceId) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
