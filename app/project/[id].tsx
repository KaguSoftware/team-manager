import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Link, router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { DateField } from "@/components/DateField";
import { GanttChart, type GanttZoom } from "@/components/GanttChart";
import { toast } from "@/components/Toast";
import { Avatar, Badge, Button, Card, EmptyState, Field, Loading, Screen, Subtle } from "@/components/ui";
import type { ProjectStatus, Task, TaskStatus } from "@/lib/database.types";
import { statusTone, taskStatuses, useMembers, useMyRole, useProject, useTasks } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { accentFg, ICON_MUTED } from "@/lib/theme";
import { useWorkspaceStore } from "@/stores/workspace";

const palette = ["#64748b", "#16a34a", "#d97706", "#dc2626", "#9333ea", "#0d9488"];
const projectStatuses: ProjectStatus[] = ["planning", "active", "on_hold", "completed"];

type StatusFilter = "all" | TaskStatus;

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const qc = useQueryClient();
  const scheme = useColorScheme();
  const { data: project, isLoading } = useProject(id ?? null);
  const { data: tasks } = useTasks(id ?? null);
  const { data: role } = useMyRole(workspaceId);
  const { data: members } = useMembers(workspaceId);
  const isAdmin = role === "owner" || role === "admin";
  const canWrite = role !== "client" && role != null;

  const [view, setView] = useState<"board" | "gantt">("board");
  const [zoom, setZoom] = useState<GanttZoom>("week");

  // edit-project modal
  const [editing, setEditing] = useState(false);
  const [eName, setEName] = useState("");
  const [eDescription, setEDescription] = useState("");
  const [eColor, setEColor] = useState(palette[0]);
  const [eStatus, setEStatus] = useState<ProjectStatus>("planning");
  const [eStart, setEStart] = useState<string | null>(null);
  const [eEnd, setEEnd] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // search + filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (tasks ?? []).filter(
      (t) =>
        t.title.toLowerCase().includes(q) &&
        (statusFilter === "all" || t.status === statusFilter) &&
        (assigneeFilter === "all" || t.assignee_id === assigneeFilter),
    );
  }, [tasks, search, statusFilter, assigneeFilter]);

  if (isLoading || !project) return <Loading />;

  const byStatus = (s: TaskStatus) => filtered.filter((t) => t.status === s);
  const visibleStatuses =
    statusFilter === "all" ? taskStatuses : taskStatuses.filter((s) => s === statusFilter);

  const openTask = (t: Task) => router.push({ pathname: "/task/[id]", params: { id: t.id } });

  const openEdit = () => {
    setEName(project.name);
    setEDescription(project.description ?? "");
    setEColor(project.color || palette[0]);
    setEStatus(project.status);
    setEStart(project.start_date);
    setEEnd(project.end_date);
    setEditing(true);
  };

  const onSaveEdit = async () => {
    if (!eName.trim()) {
      Alert.alert("Name required", "Give the project a name.");
      return;
    }
    setSavingEdit(true);
    const { error } = await supabase
      .from("projects")
      .update({
        name: eName.trim(),
        description: eDescription,
        color: eColor,
        status: eStatus,
        start_date: eStart,
        end_date: eEnd,
      })
      .eq("id", project.id);
    setSavingEdit(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["project", id] });
    qc.invalidateQueries({ queryKey: ["projects", workspaceId] });
    setEditing(false);
    toast.success("Project updated");
  };

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

  const memberName = (uid: string) =>
    members?.find((m) => m.user_id === uid)?.profiles?.full_name || "Unnamed";

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="flex-row items-center gap-3 px-4 py-2">
          <Pressable accessibilityLabel="Back" onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color={ICON_MUTED} />
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
            <>
              <Pressable accessibilityLabel="Edit project" onPress={openEdit}>
                <Ionicons name="pencil-outline" size={20} color={ICON_MUTED} />
              </Pressable>
              <Pressable accessibilityLabel="Delete project" onPress={onDeleteProject}>
                <Ionicons name="trash-outline" size={22} color="#dc2626" />
              </Pressable>
            </>
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
            {/* search */}
            <View className="mb-3 flex-row items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 dark:bg-gray-800">
              <Ionicons name="search-outline" size={18} color={ICON_MUTED} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search tasks"
                placeholderTextColor="#9ca3af"
                className="flex-1 text-gray-900 dark:text-gray-100"
              />
            </View>

            {/* status filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-2"
              contentContainerClassName="gap-2"
            >
              {(["all", ...taskStatuses] as StatusFilter[]).map((s) => {
                const active = statusFilter === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setStatusFilter(s)}
                    className={`rounded-full px-3 py-1.5 ${
                      active ? "bg-ink-950 dark:bg-ink-100" : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium capitalize ${
                        active ? "text-white dark:text-ink-950" : "text-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {s === "all" ? "All" : s.replace("_", " ")}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* assignee filter chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-3"
              contentContainerClassName="gap-2 items-center"
            >
              {(() => {
                const active = assigneeFilter === "all";
                return (
                  <Pressable
                    onPress={() => setAssigneeFilter("all")}
                    className={`rounded-full px-3 py-1.5 ${
                      active ? "bg-ink-950 dark:bg-ink-100" : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        active ? "text-white dark:text-ink-950" : "text-gray-700 dark:text-gray-200"
                      }`}
                    >
                      All
                    </Text>
                  </Pressable>
                );
              })()}
              {(members ?? []).map((m) => {
                const active = assigneeFilter === m.user_id;
                const name = m.profiles?.full_name || "Unnamed";
                return (
                  <Pressable
                    key={m.user_id}
                    onPress={() => setAssigneeFilter(m.user_id)}
                    className={`flex-row items-center gap-1.5 rounded-full py-1 pl-1 pr-3 ${
                      active ? "bg-ink-950 dark:bg-ink-100" : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    <Avatar name={name} size={22} />
                    <Text
                      className={`text-xs font-medium ${
                        active ? "text-white dark:text-ink-950" : "text-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {name.split(/\s+/)[0]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {visibleStatuses.map((status) => (
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
                      {t.assignee_id ? (
                        <Subtle className="mt-1">{memberName(t.assignee_id)}</Subtle>
                      ) : null}
                      {t.due_date ? <Subtle className="mt-1">due {t.due_date}</Subtle> : null}
                    </Card>
                  </Pressable>
                ))}
              </View>
            ))}
            {filtered.length === 0 ? (
              <EmptyState
                icon="list-outline"
                title={(tasks ?? []).length === 0 ? "No tasks yet" : "No matching tasks"}
                subtitle={
                  (tasks ?? []).length === 0
                    ? canWrite
                      ? "Add the first task below"
                      : undefined
                    : "Try a different search or filter"
                }
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
                    zoom === z ? "bg-ink-950 dark:bg-ink-100" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium capitalize ${
                      zoom === z ? "text-white dark:text-ink-950" : "text-gray-700 dark:text-gray-200"
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
              <AnimatedPressable
                accessibilityLabel="New task"
                className="h-14 w-14 items-center justify-center rounded-full bg-ink-950 shadow-lg active:bg-ink-800 dark:bg-ink-100 dark:active:bg-ink-300"
              >
                <Ionicons name="add" size={30} color={accentFg(scheme)} />
              </AnimatedPressable>
            </Link>
          </View>
        ) : null}

        {/* edit-project modal */}
        <Modal visible={editing} animationType="slide" transparent>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 justify-end bg-black/40"
          >
            <ScrollView
              className="max-h-[88%] rounded-t-3xl bg-surface-light dark:bg-surface-dark"
              contentContainerClassName="p-6 pb-10"
              keyboardShouldPersistTaps="handled"
            >
              <Text className="mb-3 text-lg font-bold text-gray-900 dark:text-gray-100">
                Edit project
              </Text>
              <Field label="Name" value={eName} onChangeText={setEName} maxLength={120} />
              <Field
                label="Description"
                value={eDescription}
                onChangeText={setEDescription}
                multiline
                numberOfLines={4}
                style={{ minHeight: 80, textAlignVertical: "top" }}
              />
              <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Color
              </Text>
              <View className="mb-4 flex-row gap-2">
                {palette.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setEColor(c)}
                    style={{ backgroundColor: c }}
                    className={`h-8 w-8 rounded-full ${eColor === c ? "border-2 border-gray-900 dark:border-white" : ""}`}
                  />
                ))}
              </View>
              <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </Text>
              <View className="mb-2 flex-row flex-wrap">
                {projectStatuses.map((s) => {
                  const active = eStatus === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setEStatus(s)}
                      className={`mb-2 mr-2 rounded-full px-3 py-1.5 ${
                        active ? "bg-ink-950 dark:bg-ink-100" : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium capitalize ${
                          active ? "text-white dark:text-ink-950" : "text-gray-700 dark:text-gray-200"
                        }`}
                      >
                        {s.replace("_", " ")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View className="mb-2 flex-row gap-3">
                <DateField label="Start" value={eStart} onChange={setEStart} />
                <DateField label="End" value={eEnd} onChange={setEEnd} />
              </View>
              <Button title="Save changes" onPress={onSaveEdit} loading={savingEdit} className="mt-2" />
              <Button title="Cancel" variant="ghost" onPress={() => setEditing(false)} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </Screen>
  );
}
