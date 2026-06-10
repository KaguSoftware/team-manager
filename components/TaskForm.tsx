import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { DateField } from "@/components/DateField";
import { Button, Field } from "@/components/ui";
import type { Task, TaskPriority, TaskStatus } from "@/lib/database.types";
import type { MemberWithProfile } from "@/lib/queries";
import { taskSchema } from "@/lib/validation";
import { z } from "zod";

export type TaskFormValues = z.infer<typeof taskSchema>;

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mb-2 mr-2 rounded-full px-3 py-1.5 ${
        active ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-700"
      }`}
    >
      <Text
        className={`text-sm font-medium capitalize ${
          active ? "text-white" : "text-gray-700 dark:text-gray-200"
        }`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function TaskForm({
  initial,
  members,
  dependencyOptions,
  submitLabel,
  busy,
  onSubmit,
}: {
  initial?: Partial<Task>;
  members: MemberWithProfile[];
  dependencyOptions: Task[];
  submitLabel: string;
  busy?: boolean;
  onSubmit: (values: TaskFormValues) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? "todo");
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? "medium");
  const [assignee, setAssignee] = useState<string | null>(initial?.assignee_id ?? null);
  const [startDate, setStartDate] = useState<string | null>(initial?.start_date ?? null);
  const [dueDate, setDueDate] = useState<string | null>(initial?.due_date ?? null);
  const [dependsOn, setDependsOn] = useState<string | null>(initial?.depends_on ?? null);

  const submit = () => {
    const parsed = taskSchema.safeParse({
      title,
      description,
      status,
      priority,
      assignee_id: assignee,
      start_date: startDate,
      due_date: dueDate,
      depends_on: dependsOn,
    });
    if (!parsed.success) {
      Alert.alert("Check the form", parsed.error.issues[0].message);
      return;
    }
    if (parsed.data.start_date && parsed.data.due_date && parsed.data.due_date < parsed.data.start_date) {
      Alert.alert("Check the dates", "Due date can't be before the start date.");
      return;
    }
    onSubmit(parsed.data);
  };

  // people who can hold a task (clients can't)
  const assignable = members.filter((m) => m.role !== "client");

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1"
    >
    <ScrollView contentContainerClassName="px-4 pb-12" keyboardShouldPersistTaps="handled">
      <Field label="Title" value={title} onChangeText={setTitle} maxLength={200} />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        style={{ minHeight: 80, textAlignVertical: "top" }}
      />

      <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Status</Text>
      <View className="flex-row flex-wrap">
        {(["todo", "in_progress", "review", "done"] as TaskStatus[]).map((s) => (
          <Chip key={s} label={s.replace("_", " ")} active={status === s} onPress={() => setStatus(s)} />
        ))}
      </View>

      <Text className="mb-1 mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Priority
      </Text>
      <View className="flex-row flex-wrap">
        {(["low", "medium", "high", "urgent"] as TaskPriority[]).map((p) => (
          <Chip key={p} label={p} active={priority === p} onPress={() => setPriority(p)} />
        ))}
      </View>

      <Text className="mb-1 mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Assignee
      </Text>
      <View className="flex-row flex-wrap">
        <Chip label="Unassigned" active={assignee === null} onPress={() => setAssignee(null)} />
        {assignable.map((m) => (
          <Chip
            key={m.user_id}
            label={m.profiles?.full_name || "Unnamed"}
            active={assignee === m.user_id}
            onPress={() => setAssignee(m.user_id)}
          />
        ))}
      </View>

      <View className="mt-2 flex-row gap-3">
        <DateField label="Start" value={startDate} onChange={setStartDate} />
        <DateField label="Due" value={dueDate} onChange={setDueDate} />
      </View>

      {dependencyOptions.length > 0 ? (
        <>
          <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Depends on
          </Text>
          <View className="flex-row flex-wrap">
            <Chip label="None" active={dependsOn === null} onPress={() => setDependsOn(null)} />
            {dependencyOptions
              .filter((t) => t.id !== initial?.id)
              .map((t) => (
                <Chip
                  key={t.id}
                  label={t.title.slice(0, 24)}
                  active={dependsOn === t.id}
                  onPress={() => setDependsOn(t.id)}
                />
              ))}
          </View>
        </>
      ) : null}

      <Button title={submitLabel} onPress={submit} loading={busy} className="mt-4" />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}
