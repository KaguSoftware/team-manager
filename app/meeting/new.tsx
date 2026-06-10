import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { DateTimeField } from "@/components/DateField";
import { toast } from "@/components/Toast";
import { Button, Field, Screen } from "@/components/ui";
import { useMembers } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { meetingSchema } from "@/lib/validation";
import { useUserId } from "@/providers/AuthProvider";
import { useWorkspaceStore } from "@/stores/workspace";

function nextFullHour() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

export default function NewMeeting() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const userId = useUserId();
  const qc = useQueryClient();
  const { data: members } = useMembers(workspaceId);

  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [location, setLocation] = useState("");
  const [start, setStart] = useState<Date>(nextFullHour);
  const [end, setEnd] = useState<Date>(() => {
    const d = nextFullHour();
    d.setHours(d.getHours() + 1);
    return d;
  });
  const [attendees, setAttendees] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // moving the start drags the end along, keeping the meeting length
  const onStartChange = (d: Date) => {
    const duration = end.getTime() - start.getTime();
    setStart(d);
    setEnd(new Date(d.getTime() + Math.max(duration, 15 * 60_000)));
  };

  const toggleAttendee = (id: string) =>
    setAttendees((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const onCreate = async () => {
    const parsed = meetingSchema.safeParse({
      title,
      agenda,
      location,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
    });
    if (!parsed.success) {
      Alert.alert("Check the form", parsed.error.issues[0].message);
      return;
    }

    setBusy(true);
    const { data: meeting, error } = await supabase
      .from("meetings")
      .insert({ workspace_id: workspaceId!, created_by: userId!, ...parsed.data })
      .select()
      .single();
    if (error || !meeting) {
      setBusy(false);
      Alert.alert("Could not create meeting", error?.message ?? "Unknown error");
      return;
    }

    const rows = Array.from(new Set([...attendees, userId!])).map((uid) => ({
      meeting_id: meeting.id,
      user_id: uid,
    }));
    const { error: attErr } = await supabase.from("meeting_attendees").insert(rows);
    setBusy(false);
    if (attErr) {
      Alert.alert("Meeting created, but attendees failed", attErr.message);
    } else {
      toast.success("Meeting created");
    }
    qc.invalidateQueries({ queryKey: ["meetings", workspaceId] });
    router.back();
  };

  const invitable = (members ?? []).filter((m) => m.role !== "client" && m.user_id !== userId);

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
        >
          <View className="flex-row items-center gap-3 px-4 py-2">
            <Pressable accessibilityLabel="Back" onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={26} color="#6b7280" />
            </Pressable>
            <Text className="text-lg font-bold text-gray-900 dark:text-gray-50">New meeting</Text>
          </View>
          <ScrollView contentContainerClassName="px-4 pb-12" keyboardShouldPersistTaps="handled">
            <Field label="Title" value={title} onChangeText={setTitle} maxLength={200} />

            <View className="flex-row gap-3">
              <DateTimeField label="Starts" value={start} onChange={onStartChange} />
              <DateTimeField label="Ends" value={end} onChange={setEnd} />
            </View>

            <Field
              label="Location / video link"
              value={location}
              onChangeText={setLocation}
              autoCapitalize="none"
              placeholder="Office or https://meet…"
            />
            <Field
              label="Agenda (optional)"
              value={agenda}
              onChangeText={setAgenda}
              multiline
              placeholder="What's this meeting about?"
            />

            <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Attendees (you are included automatically)
            </Text>
            <View className="mb-2 flex-row flex-wrap">
              {invitable.map((m) => {
                const active = attendees.includes(m.user_id);
                return (
                  <Pressable
                    key={m.user_id}
                    onPress={() => toggleAttendee(m.user_id)}
                    className={`mb-2 mr-2 rounded-full px-3 py-1.5 ${
                      active
                        ? "bg-ink-950 active:bg-ink-800 dark:bg-ink-100 dark:active:bg-ink-300"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        active ? "text-white dark:text-ink-950" : "text-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {m.profiles?.full_name || "Unnamed"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Button title="Schedule meeting" onPress={onCreate} loading={busy} className="mt-2" />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Screen>
  );
}
