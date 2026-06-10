import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TaskForm, type TaskFormValues } from "@/components/TaskForm";
import { toast } from "@/components/Toast";
import { Loading, Screen } from "@/components/ui";
import { useMembers, useMyRole, useTasks } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/providers/AuthProvider";
import { useWorkspaceStore } from "@/stores/workspace";

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const userId = useUserId();
  const qc = useQueryClient();
  const { data: members } = useMembers(workspaceId);
  const { data: role } = useMyRole(workspaceId);
  const [busy, setBusy] = useState(false);

  const taskQ = useQuery({
    queryKey: ["task", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("id", id!).single();
      if (error) throw new Error(error.message);
      return data;
    },
  });
  const { data: siblings } = useTasks(taskQ.data?.project_id ?? null);

  if (taskQ.isLoading || !taskQ.data) return <Loading />;
  const task = taskQ.data;

  const isAdmin = role === "owner" || role === "admin";
  const canEdit =
    isAdmin || (role === "member" && (task.assignee_id === userId || task.created_by === userId));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["task", id] });
    qc.invalidateQueries({ queryKey: ["tasks", task.project_id] });
    qc.invalidateQueries({ queryKey: ["my-tasks"] });
  };

  const onSubmit = async (values: TaskFormValues) => {
    setBusy(true);
    const { error } = await supabase.from("tasks").update(values).eq("id", task.id);
    setBusy(false);
    if (error) {
      Alert.alert("Could not save", error.message);
      return;
    }
    invalidate();
    toast.success("Task updated");
    router.back();
  };

  const onDelete = () => {
    Alert.alert("Delete task", `Delete "${task.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("tasks").delete().eq("id", task.id);
          if (error) {
            Alert.alert("Could not delete", error.message);
            return;
          }
          invalidate();
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="flex-row items-center gap-3 px-4 py-2">
          <Pressable accessibilityLabel="Back" onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#6b7280" />
          </Pressable>
          <Text className="flex-1 text-lg font-bold text-gray-900 dark:text-gray-50" numberOfLines={1}>
            {canEdit ? "Edit task" : task.title}
          </Text>
          {canEdit ? (
            <Pressable accessibilityLabel="Delete task" onPress={onDelete}>
              <Ionicons name="trash-outline" size={22} color="#dc2626" />
            </Pressable>
          ) : null}
        </View>

        {canEdit ? (
          <TaskForm
            initial={task}
            members={members ?? []}
            dependencyOptions={siblings ?? []}
            submitLabel="Save changes"
            busy={busy}
            onSubmit={onSubmit}
          />
        ) : (
          <View className="px-4">
            <Text className="mb-2 text-gray-700 dark:text-gray-300">{task.description || "No description."}</Text>
            <Text className="text-sm text-gray-500">
              Status: {task.status} · Priority: {task.priority}
              {task.due_date ? ` · Due ${task.due_date}` : ""}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Screen>
  );
}
