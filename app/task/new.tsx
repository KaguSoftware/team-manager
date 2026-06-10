import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TaskForm, type TaskFormValues } from "@/components/TaskForm";
import { toast } from "@/components/Toast";
import { Loading, Screen } from "@/components/ui";
import { useMembers, useTasks } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/providers/AuthProvider";
import { useWorkspaceStore } from "@/stores/workspace";

export default function NewTask() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const userId = useUserId();
  const qc = useQueryClient();
  const { data: members } = useMembers(workspaceId);
  const { data: tasks } = useTasks(projectId ?? null);
  const [busy, setBusy] = useState(false);

  if (!projectId || !workspaceId) return <Loading />;

  const onSubmit = async (values: TaskFormValues) => {
    setBusy(true);
    const { error } = await supabase.from("tasks").insert({
      project_id: projectId,
      workspace_id: workspaceId,
      created_by: userId!,
      ...values,
    });
    setBusy(false);
    if (error) {
      Alert.alert("Could not create task", error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["tasks", projectId] });
    qc.invalidateQueries({ queryKey: ["my-tasks"] });
    toast.success("Task created");
    router.back();
  };

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="flex-row items-center gap-3 px-4 py-2">
          <Pressable accessibilityLabel="Back" onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#6b7280" />
          </Pressable>
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-50">New task</Text>
        </View>
        <TaskForm
          members={members ?? []}
          dependencyOptions={tasks ?? []}
          submitLabel="Create task"
          busy={busy}
          onSubmit={onSubmit}
        />
      </SafeAreaView>
    </Screen>
  );
}
