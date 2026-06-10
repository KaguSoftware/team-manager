import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { KaguLogo } from "@/components/KaguLogo";
import { SkeletonList } from "@/components/Skeleton";
import { StatCard } from "@/components/StatCard";
import { Badge, Card, EmptyState, Screen, Subtle } from "@/components/ui";
import { dashboardStats, type TaskLite } from "@/lib/insights";
import {
  statusTone,
  useMeetings,
  useMyTasks,
  useMyWorkspaces,
  useNotifications,
  useProfile,
  useWorkspaceTasks,
} from "@/lib/queries";
import { useUserId } from "@/providers/AuthProvider";
import { useWorkspaceStore } from "@/stores/workspace";

function greeting(now: Date, firstName: string) {
  const h = now.getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${part}, ${firstName}`;
}

export default function Home() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const userId = useUserId();
  const { data: workspaces } = useMyWorkspaces();
  const { data: profile } = useProfile(userId);
  const tasksQ = useMyTasks(workspaceId, userId);
  const meetingsQ = useMeetings(workspaceId);
  const workspaceTasksQ = useWorkspaceTasks(workspaceId);
  const { data: notifications } = useNotifications();

  const workspace = workspaces?.find((w) => w.id === workspaceId);
  const unread = notifications?.filter((n) => !n.read_at).length ?? 0;

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59);
  const todaysMeetings = (meetingsQ.data ?? []).filter(
    (m) => new Date(m.ends_at) >= now && new Date(m.starts_at) <= endOfDay,
  );

  const stats = dashboardStats(
    (workspaceTasksQ.data ?? []) as TaskLite[],
    meetingsQ.data ?? [],
  );

  const refreshing =
    tasksQ.isRefetching || meetingsQ.isRefetching || workspaceTasksQ.isRefetching;
  const onRefresh = () => {
    tasksQ.refetch();
    meetingsQ.refetch();
    workspaceTasksQ.refetch();
  };

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <ScrollView
          contentContainerClassName="px-4 pb-8"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View className="mb-4 mt-2 flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center gap-2 pr-2">
              <KaguLogo size={28} />
              <View className="flex-1">
                <Subtle>{workspace?.name ?? "Workspace"}</Subtle>
                <Text
                  className="text-xl font-bold text-gray-900 dark:text-gray-50"
                  numberOfLines={1}
                >
                  {greeting(now, firstName)}
                </Text>
              </View>
            </View>
            <View className="flex-row gap-4">
              <Pressable accessibilityLabel="Insights" onPress={() => router.push("/insights")}>
                <Ionicons name="stats-chart-outline" size={26} color="#6b7280" />
              </Pressable>
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

          <View className="mb-2 flex-row flex-wrap gap-3">
            <View style={{ flexBasis: "48%", flexGrow: 1 }}>
              <StatCard label="Open tasks" value={stats.open} icon="list-outline" />
            </View>
            <View style={{ flexBasis: "48%", flexGrow: 1 }}>
              <StatCard label="Due this week" value={stats.dueThisWeek} icon="calendar-outline" />
            </View>
            <View style={{ flexBasis: "48%", flexGrow: 1 }}>
              <StatCard
                label="Overdue"
                value={stats.overdue}
                icon="alert-circle-outline"
                tone={stats.overdue > 0 ? "danger" : "default"}
              />
            </View>
            <View style={{ flexBasis: "48%", flexGrow: 1 }}>
              <StatCard
                label="Meetings today"
                value={stats.meetingsToday}
                icon="videocam-outline"
              />
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
            todaysMeetings.map((m, i) => (
              <Animated.View key={m.id} entering={FadeInDown.delay(Math.min(i * 40, 320))}>
                <Link href={{ pathname: "/meeting/[id]", params: { id: m.id } }} asChild>
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
              </Animated.View>
            ))
          )}

          <Text className="mb-2 mt-6 text-base font-semibold text-gray-700 dark:text-gray-200">
            My open tasks
          </Text>
          {tasksQ.isLoading ? (
            <SkeletonList count={3} />
          ) : (tasksQ.data ?? []).length === 0 ? (
            <EmptyState
              icon="checkmark-done-circle-outline"
              title="Nothing assigned"
              subtitle="Tasks assigned to you will show up here"
            />
          ) : (
            (tasksQ.data ?? []).map((t, i) => (
              <Animated.View key={t.id} entering={FadeInDown.delay(Math.min(i * 40, 320))}>
                <Link href={{ pathname: "/task/[id]", params: { id: t.id } }} asChild>
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
              </Animated.View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
