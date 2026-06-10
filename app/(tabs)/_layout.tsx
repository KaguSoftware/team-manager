import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useEffect } from "react";
import { Loading } from "@/components/ui";
import { registerForPushNotifications } from "@/lib/push";
import { useAuth } from "@/providers/AuthProvider";
import { useWorkspaceStore } from "@/stores/workspace";

export default function TabsLayout() {
  const { session, loading } = useAuth();
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);

  useEffect(() => {
    if (session?.user.id) registerForPushNotifications(session.user.id);
  }, [session?.user.id]);

  if (loading) return <Loading />;
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!workspaceId) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2547eb",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Projects",
          tabBarIcon: ({ color, size }) => <Ionicons name="folder" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="meetings"
        options={{
          title: "Meetings",
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ideas"
        options={{
          title: "Ideas",
          tabBarIcon: ({ color, size }) => <Ionicons name="bulb" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: "Team",
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
