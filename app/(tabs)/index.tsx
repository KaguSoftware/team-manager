import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge, Card, EmptyState, Screen, Subtle, Title } from "@/components/ui";
import {
  statusTone,
  useMeetings,
  useMyTasks,
  useMyWorkspaces,
  useNotifications,
} from "@/lib/queries";
import { useUserId } from "@/providers/AuthProvider";
import { useWorkspaceStore } from "@/stores/workspace";

export default function Home() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const userId = useUserId();
  const { data: workspaces } = useMyWorkspaces();
  const tasksQ = useMyTasks(workspaceId, userId);
  const meetingsQ = useMeetings(workspaceId);
  const { data: notifications } = useNotifications();

  const workspace = workspaces?.find((w) => w.id === workspaceId);
  const unread = notifications?.filter((n) => !n.read_at).length ?? 0;

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59);
  const todaysMeetings = (meetingsQ.data ?? []).filter(
    (m) => new Date(m.ends_at) >= now && new Date(m.starts_at) <= endOfDay,
  );

  const refreshing = tasksQ.isRefetching || meetingsQ.isRefetching;
  const onRefresh = () => {
    tasksQ.refetch();
    meetingsQ.refetch();
  };

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          contentContainerClassName="px-4 pb-8"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View className="mb-4 mt-2 flex-row items-center justify-between">
            <View>
              <Subtle>{workspace?.name ?? "Workspace"}</Subtle>
              <Title>Today</Title>
            </View>
            <View className="flex-row gap-4">
              <Pressable
                accessibilityLabel="Notifications"
                onPress={() => router.push("/notifications")}
              >
                <Ionicons name="notifications-outline" size={26} color="#6b7280" />
                {unread > 0 ? (
                  <View className="absolute -right-1 -top-1 h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1">
                    <Text className="text-[10px] font-bold text-white">{unread}</Text>
                  </View>
                ) : null}
              </Pressable>
              <Pressable accessibilityLabel="Settings" onPress={() => router.push("/settings")}>
                <Ionicons name="settings-outline" size={26} color="#6b7280" />
              </Pressable>
            </View>
          </View>

          <Text className="mb-2 mt-2 text-base font-semibold text-gray-700 dark:text-gray-200">
            Today&apos;s meetings
          </Text>
          {todaysMeetings.length === 0 ? (
            <Card>
              <Subtle>No meetings today 🎉</Subtle>
            </Card>
          ) : (
            todaysMeetings.map((m) => (
              <Link key={m.id} href={{ pathname: "/meeting/[id]", params: { id: m.id } }} asChild>
                <Pressable>
                  <Card className="mb-2">
                    <Text className="font-semibold text-gray-900 dark:text-gray-100">
                      {m.title}
                    </Text>
                    <Subtle>
                      {new Date(m.starts_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" – "}
                      {new Date(m.ends_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {m.location ? ` · ${m.location}` : ""}
                    </Subtle>
                  </Card>
                </Pressable>
              </Link>
            ))
          )}

          <Text className="mb-2 mt-6 text-base font-semibold text-gray-700 dark:text-gray-200">
            My open tasks
          </Text>
          {(tasksQ.data ?? []).length === 0 ? (
            <EmptyState
              icon="checkmark-done-circle-outline"
              title="Nothing assigned"
              subtitle="Tasks assigned to you will show up here"
            />
          ) : (
            (tasksQ.data ?? []).map((t) => (
              <Link
                key={t.id}
                href={{ pathname: "/task/[id]", params: { id: t.id } }}
                asChild
              >
                <Pressable>
                  <Card className="mb-2">
                    <View className="flex-row items-center justify-between">
                      <Text
                        className="flex-1 pr-2 font-semibold text-gray-900 dark:text-gray-100"
                        numberOfLines={1}
                      >
                        {t.title}
                      </Text>
                      <Badge text={t.status.replace("_", " ")} tone={statusTone[t.status]} />
                    </View>
                    <Subtle>
                      {(t as { projects?: { name: string } | null }).projects?.name ?? ""}
                      {t.due_date ? ` · due ${t.due_date}` : ""}
                    </Subtle>
                  </Card>
                </Pressable>
              </Link>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
