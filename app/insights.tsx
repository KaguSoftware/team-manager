import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { ProgressRow } from "@/components/charts/ProgressRow";
import { WorkloadRow } from "@/components/charts/WorkloadRow";
import { Card, EmptyState, Screen } from "@/components/ui";
import { SkeletonList } from "@/components/Skeleton";
import { StatCard } from "@/components/StatCard";
import {
  completionsByDay,
  dashboardStats,
  memberWorkload,
  projectProgress,
  statusCounts,
  type TaskLite,
} from "@/lib/insights";
import { useMeetings, useMembers, useProjects, useWorkspaceTasks } from "@/lib/queries";
import { STATUS_COLORS } from "@/lib/theme";
import { useWorkspaceStore } from "@/stores/workspace";
import type { TaskStatus } from "@/lib/database.types";

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  review: "Review",
  done: "Done",
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-3">
      <Text className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </Text>
      {children}
    </Card>
  );
}

export default function InsightsScreen() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const tasksQ = useWorkspaceTasks(workspaceId);
  const projectsQ = useProjects(workspaceId);
  const membersQ = useMembers(workspaceId);
  const meetingsQ = useMeetings(workspaceId);

  // Memoize the empty-array fallbacks so they keep a stable identity across
  // renders — otherwise the aggregation useMemos below recompute every render.
  const tasks = useMemo(() => (tasksQ.data ?? []) as TaskLite[], [tasksQ.data]);
  const projects = useMemo(() => projectsQ.data ?? [], [projectsQ.data]);
  const members = useMemo(() => membersQ.data ?? [], [membersQ.data]);
  const meetings = useMemo(() => meetingsQ.data ?? [], [meetingsQ.data]);

  const stats = useMemo(() => dashboardStats(tasks, meetings), [tasks, meetings]);
  const counts = useMemo(() => statusCounts(tasks), [tasks]);
  const completions = useMemo(() => completionsByDay(tasks, 14), [tasks]);
  const progress = useMemo(() => projectProgress(tasks, projects), [tasks, projects]);
  const workload = useMemo(() => memberWorkload(tasks, members), [tasks, members]);

  const total = tasks.length;
  const donutData = (Object.keys(counts) as TaskStatus[]).map((status) => ({
    label: STATUS_LABELS[status],
    value: counts[status],
    color: STATUS_COLORS[status],
  }));
  const workloadMax = Math.max(1, ...workload.map((w) => w.open));

  const refreshing =
    tasksQ.isRefetching ||
    projectsQ.isRefetching ||
    membersQ.isRefetching ||
    meetingsQ.isRefetching;
  const onRefresh = () => {
    tasksQ.refetch();
    projectsQ.refetch();
    membersQ.refetch();
    meetingsQ.refetch();
  };

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="flex-row items-center gap-3 px-4 py-2">
          <Pressable accessibilityLabel="Back" onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#6b7280" />
          </Pressable>
          <Text className="flex-1 text-lg font-bold text-gray-900 dark:text-gray-50">
            Insights
          </Text>
        </View>

        {tasksQ.isLoading ? (
          <View className="px-4">
            <SkeletonList />
          </View>
        ) : total === 0 ? (
          <EmptyState
            icon="bar-chart-outline"
            title="No data yet"
            subtitle="Create tasks to see insights"
          />
        ) : (
          <ScrollView
            contentContainerClassName="px-4 pb-8"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <View className="mb-3 flex-row flex-wrap gap-3">
              <View style={{ flexBasis: "48%", flexGrow: 1 }}>
                <StatCard label="Open tasks" value={stats.open} icon="list-outline" />
              </View>
              <View style={{ flexBasis: "48%", flexGrow: 1 }}>
                <StatCard
                  label="Due this week"
                  value={stats.dueThisWeek}
                  icon="calendar-outline"
                />
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

            <SectionCard title="Task status">
              <DonutChart
                data={donutData}
                centerValue={String(total)}
                centerLabel="tasks"
              />
            </SectionCard>

            <SectionCard title="Completed — last 14 days">
              <BarChart data={completions.map((c) => ({ label: c.label, value: c.count }))} />
            </SectionCard>

            {progress.length > 0 ? (
              <SectionCard title="Project progress">
                {progress.map(({ project, done, total: t }) => (
                  <ProgressRow
                    key={project.id}
                    label={project.name}
                    done={done}
                    total={t}
                    color={project.color}
                  />
                ))}
              </SectionCard>
            ) : null}

            {workload.length > 0 ? (
              <SectionCard title="Workload">
                {workload.map(({ member, open }) => (
                  <WorkloadRow
                    key={member.user_id}
                    name={member.profiles?.full_name ?? "Unnamed"}
                    open={open}
                    max={workloadMax}
                  />
                ))}
              </SectionCard>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </Screen>
  );
}
