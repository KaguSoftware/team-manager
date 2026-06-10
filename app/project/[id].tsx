import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Link, router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GanttChart, type GanttZoom } from "@/components/GanttChart";
import { Badge, Card, EmptyState, Loading, Screen, Subtle } from "@/components/ui";
import type { Task, TaskStatus } from "@/lib/database.types";
import { statusTone, taskStatuses, useMyRole, useProject, useTasks } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { useWorkspaceStore } from "@/stores/workspace";

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const qc = useQueryClient();
  const { data: project, isLoading } = useProject(id ?? null);
  const { data: tasks } = useTasks(id ?? null);
  const { data: role } = useMyRole(workspaceId);
  const isAdmin = role === "owner" || role === "admin";
  const canWrite = role !== "client" && role != null;

  const [view, setView] = useState<"board" | "gantt">("board");
  const [zoom, setZoom] = useState<GanttZoom>("week");

  if (isLoading || !project) return <Loading />;

  const byStatus = (s: TaskStatus) => (tasks ?? []).filter((t) => t.status === s);

  const openTask = (t: Task) => router.push({ pathname: "/task/[id]", params: { id: t.id } });

  const onDeleteProject = () => {
    Alert.alert("Delete project", `Delete "${project.name}" and all its tasks?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("projects").delete().eq("id", project.id);
          if (error) {
            Alert.alert("Could not delete", error.message);
            return;
          }
          qc.invalidateQueries({ queryKey: ["projects", workspaceId] });
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="flex-row items-center gap-3 px-4 py-2">
          <Pressable accessibilityLabel="Back" onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#6b7280" />
          </Pressable>
          <View
            style={{ backgroundColor: project.color }}
            className="h-3.5 w-3.5 rounded-full"
          />
          <Text className="flex-1 text-lg font-bold text-gray-900 dark:text-gray-50" numberOfLines={1}>
            {project.name}
          </Text>
          <Badge text={project.status.replace("_", " ")} tone={statusTone[project.status]} />
          {isAdmin ? (
            <Pressable accessibilityLabel="Delete project" onPress={onDeleteProject}>
              <Ionicons name="trash-outline" size={22} color="#dc2626" />
            </Pressable>
          ) : null}
        </View>

        <View className="mx-4 mb-2 flex-row rounded-xl bg-gray-200 p-1 dark:bg-gray-800">
          {(["board", "gantt"] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              className={`flex-1 items-center rounded-lg py-1.5 ${
                view === v ? "bg-surface-light dark:bg-surface-dark" : ""
              }`}
            >
              <Text className="font-medium capitalize text-gray-800 dark:text-gray-200">
                {v === "gantt" ? "Timeline" : "Board"}
              </Text>
            </Pressable>
          ))}
        </View>

        {view === "board" ? (
          <ScrollView contentContainerClassName="px-4 pb-24">
            {taskStatuses.map((status) => (
              <View key={status} className="mb-4">
                <View className="mb-2 flex-row items-center gap-2">
                  <Text className="font-semibold capitalize text-gray-700 dark:text-gray-200">
                    {status.replace("_", " ")}
                  </Text>
                  <Subtle>{byStatus(status).length}</Subtle>
                </View>
                {byStatus(status).map((t) => (
                  <Pressable key={t.id} onPress={() => openTask(t)}>
                    <Card className="mb-2">
                      <View className="flex-row items-center justify-between">
                        <Text
                          className="flex-1 pr-2 font-medium text-gray-900 dark:text-gray-100"
                          numberOfLines={2}
                        >
                          {t.title}
                        </Text>
                        <Badge
                          text={t.priority}
                          tone={
                            t.priority === "urgent"
                              ? "red"
                              : t.priority === "high"
                                ? "amber"
                                : "gray"
                          }
                        />
                      </View>
                      {t.due_date ? <Subtle className="mt-1">due {t.due_date}</Subtle> : null}
                    </Card>
                  </Pressable>
                ))}
              </View>
            ))}
            {(tasks ?? []).length === 0 ? (
              <EmptyState
                icon="list-outline"
                title="No tasks yet"
                subtitle={canWrite ? "Add the first task below" : undefined}
              />
            ) : null}
          </ScrollView>
        ) : (
          <View className="flex-1 px-2">
            <View className="mb-2 flex-row justify-end gap-2 px-2">
              {(["day", "week", "month"] as GanttZoom[]).map((z) => (
                <Pressable
                  key={z}
                  onPress={() => setZoom(z)}
                  className={`rounded-full px-3 py-1 ${
                    zoom === z ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium capitalize ${
                      zoom === z ? "text-white" : "text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {z}
                  </Text>
                </Pressable>
              ))}
            </View>
            <ScrollView>
              <GanttChart tasks={tasks ?? []} zoom={zoom} onTaskPress={openTask} />
            </ScrollView>
          </View>
        )}

        {canWrite ? (
          <View className="absolute bottom-6 right-6">
            <Link href={{ pathname: "/task/new", params: { projectId: project.id } }} asChild>
              <Pressable
                accessibilityLabel="New task"
                className="h-14 w-14 items-center justify-center rounded-full bg-brand-600 shadow-lg"
              >
                <Ionicons name="add" size={30} color="#fff" />
              </Pressable>
            </Link>
          </View>
        ) : null}
      </SafeAreaView>
    </Screen>
  );
}
