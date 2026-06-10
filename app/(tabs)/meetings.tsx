import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, useColorScheme, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { SkeletonList } from "@/components/Skeleton";
import { Card, EmptyState, Screen, Subtle, Title } from "@/components/ui";
import { useMeetings, useMyRole } from "@/lib/queries";
import { accent, accentFg, ICON_MUTED } from "@/lib/theme";
import { useWorkspaceStore } from "@/stores/workspace";

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Meetings() {
  const scheme = useColorScheme();
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const { data: meetings, isLoading, refetch, isRefetching } = useMeetings(workspaceId);
  const { data: role } = useMyRole(workspaceId);
  const isAdmin = role === "owner" || role === "admin";
  const [selected, setSelected] = useState(dayKey(new Date().toISOString()));

  const marked = useMemo(() => {
    const m: Record<string, { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }> = {};
    for (const meeting of meetings ?? []) {
      m[dayKey(meeting.starts_at)] = { marked: true, dotColor: "#64748b" };
    }
    m[selected] = { ...(m[selected] ?? {}), selected: true, selectedColor: accent(scheme) };
    return m;
  }, [meetings, selected, scheme]);

  const calendarTheme = useMemo(
    () => ({
      calendarBackground: "transparent",
      dayTextColor: scheme === "dark" ? "#e4e4e7" : "#18181b",
      monthTextColor: scheme === "dark" ? "#e4e4e7" : "#18181b",
      textSectionTitleColor: ICON_MUTED,
      textDisabledColor: scheme === "dark" ? "#3f3f46" : "#d4d4d8",
      todayTextColor: accent(scheme),
      arrowColor: accent(scheme),
      selectedDayBackgroundColor: accent(scheme),
      selectedDayTextColor: accentFg(scheme),
      dotColor: "#64748b",
      selectedDotColor: accentFg(scheme),
    }),
    [scheme],
  );

  const dayMeetings = (meetings ?? []).filter((m) => dayKey(m.starts_at) === selected);

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="mb-2 mt-2 flex-row items-center justify-between px-4">
          <Title>Meetings</Title>
          {isAdmin ? (
            <AnimatedPressable
              accessibilityLabel="New meeting"
              onPress={() => router.push("/meeting/new")}
              className="rounded-full bg-ink-950 active:bg-ink-800 dark:bg-ink-100 dark:active:bg-ink-300 p-2"
            >
              <Ionicons name="add" size={22} color={accentFg(scheme)} />
            </AnimatedPressable>
          ) : null}
        </View>

        <Calendar
          key={scheme}
          markedDates={marked}
          onDayPress={(d: { dateString: string }) => setSelected(d.dateString)}
          theme={calendarTheme}
        />

        <ScrollView
          contentContainerClassName="px-4 py-4"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          {isLoading ? (
            <SkeletonList count={3} />
          ) : dayMeetings.length === 0 ? (
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
