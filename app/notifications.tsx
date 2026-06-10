import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, EmptyState, Loading, Screen, Subtle } from "@/components/ui";
import type { AppNotification } from "@/lib/database.types";
import { useNotificationMutations, useNotifications } from "@/lib/queries";
import { ICON_MUTED } from "@/lib/theme";

function linkKey(n: AppNotification): boolean {
  const d = (n.data ?? {}) as Record<string, unknown>;
  return (
    typeof d.task_id === "string" ||
    typeof d.meeting_id === "string" ||
    typeof d.idea_id === "string" ||
    n.type === "member_joined"
  );
}

export default function NotificationsScreen() {
  const { data, isLoading, refetch, isRefetching } = useNotifications();
  const { markRead, markAllRead } = useNotificationMutations();

  const open = (n: AppNotification) => {
    if (!n.read_at) markRead.mutate(n.id);
    const d = (n.data ?? {}) as Record<string, unknown>;
    if (typeof d.task_id === "string") router.push({ pathname: "/task/[id]", params: { id: d.task_id } });
    else if (typeof d.meeting_id === "string") router.push({ pathname: "/meeting/[id]", params: { id: d.meeting_id } });
    else if (typeof d.idea_id === "string") router.push({ pathname: "/idea/[id]", params: { id: d.idea_id } });
    else if (n.type === "member_joined") router.push("/(tabs)/team");
  };

  if (isLoading) return <Loading />;
  const unread = (data ?? []).filter((n) => !n.read_at).length;

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="flex-row items-center gap-3 px-4 py-2">
          <Pressable accessibilityLabel="Back" onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#6b7280" />
          </Pressable>
          <Text className="flex-1 text-lg font-bold text-gray-900 dark:text-gray-50">
            Notifications
          </Text>
          {unread > 0 ? (
            <Button title="Mark all read" variant="ghost" onPress={() => markAllRead.mutate()} />
          ) : null}
        </View>
        <FlatList
          data={data ?? []}
          keyExtractor={(n) => n.id}
          contentContainerClassName="px-4 pb-8 flex-grow"
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <EmptyState icon="notifications-off-outline" title="Nothing here yet" />
          }
          renderItem={({ item }) => {
            const linkable = linkKey(item);
            return (
              <Pressable onPress={() => open(item)}>
                <Card className={`mb-2 ${item.read_at ? "opacity-60" : ""}`}>
                  <View className="flex-row items-center gap-2">
                    {!item.read_at ? (
                      <View className="h-2 w-2 rounded-full bg-ink-950 dark:bg-ink-50" />
                    ) : null}
                    <Text className="flex-1 font-semibold text-gray-900 dark:text-gray-100">
                      {item.title}
                    </Text>
                    {linkable ? (
                      <Ionicons name="chevron-forward" size={18} color={ICON_MUTED} />
                    ) : null}
                  </View>
                  {item.body ? <Subtle className="mt-0.5">{item.body}</Subtle> : null}
                  <Subtle className="mt-1">
                    {new Date(item.created_at).toLocaleString([], {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Subtle>
                </Card>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Screen>
  );
}
