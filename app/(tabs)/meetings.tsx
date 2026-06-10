import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, EmptyState, Screen, Subtle, Title } from "@/components/ui";
import { useMeetings, useMyRole } from "@/lib/queries";
import { useWorkspaceStore } from "@/stores/workspace";

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Meetings() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const { data: meetings } = useMeetings(workspaceId);
  const { data: role } = useMyRole(workspaceId);
  const isAdmin = role === "owner" || role === "admin";
  const [selected, setSelected] = useState(dayKey(new Date().toISOString()));

  const marked = useMemo(() => {
    const m: Record<string, { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }> = {};
    for (const meeting of meetings ?? []) {
      m[dayKey(meeting.starts_at)] = { marked: true, dotColor: "#2547eb" };
    }
    m[selected] = { ...(m[selected] ?? {}), selected: true, selectedColor: "#2547eb" };
    return m;
  }, [meetings, selected]);

  const dayMeetings = (meetings ?? []).filter((m) => dayKey(m.starts_at) === selected);

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="mb-2 mt-2 flex-row items-center justify-between px-4">
          <Title>Meetings</Title>
          {isAdmin ? (
            <Pressable
              accessibilityLabel="New meeting"
              onPress={() => router.push("/meeting/new")}
              className="rounded-full bg-brand-600 p-2"
            >
              <Ionicons name="add" size={22} color="#fff" />
            </Pressable>
          ) : null}
        </View>

        <Calendar
          markedDates={marked}
          onDayPress={(d: { dateString: string }) => setSelected(d.dateString)}
          theme={{ todayTextColor: "#2547eb", arrowColor: "#2547eb" }}
        />

        <ScrollView contentContainerClassName="px-4 py-4">
          {dayMeetings.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No meetings on this day"
              subtitle={isAdmin ? "Tap + to schedule one" : undefined}
            />
          ) : (
            dayMeetings.map((m) => (
              <Link key={m.id} href={{ pathname: "/meeting/[id]", params: { id: m.id } }} asChild>
                <Pressable>
                  <Card className="mb-2">
                    <Text className="font-semibold text-gray-900 dark:text-gray-100">
                      {m.title}
                    </Text>
                    <Subtle>
                      {new Date(m.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" – "}
                      {new Date(m.ends_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {m.location ? ` · ${m.location}` : ""}
                      {" · "}
                      {m.meeting_attendees.length} attendee
                      {m.meeting_attendees.length === 1 ? "" : "s"}
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
