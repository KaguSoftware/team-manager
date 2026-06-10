import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon,
} from "expo-router/unstable-native-tabs";
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

  // Native UITabBarController / Material bottom navigation — on iOS 26 this
  // renders Apple's Liquid Glass tab bar automatically.
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
        <Icon
          sf={{ default: "house", selected: "house.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="home" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="projects">
        <Label>Projects</Label>
        <Icon
          sf={{ default: "folder", selected: "folder.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="folder" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="meetings">
        <Label>Meetings</Label>
        <Icon
          sf={{ default: "calendar", selected: "calendar" }}
          androidSrc={<VectorIcon family={Ionicons} name="calendar" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="ideas">
        <Label>Ideas</Label>
        <Icon
          sf={{ default: "lightbulb", selected: "lightbulb.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="bulb" />}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="team">
        <Label>Team</Label>
        <Icon
          sf={{ default: "person.2", selected: "person.2.fill" }}
          androidSrc={<VectorIcon family={Ionicons} name="people" />}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
