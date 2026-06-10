import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "@/components/Toast";
import { Avatar, Badge, Button, Card, Loading, Screen, Subtle } from "@/components/ui";
import type { RsvpStatus } from "@/lib/database.types";
import { useMyRole, useRsvp } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/providers/AuthProvider";
import { useWorkspaceStore } from "@/stores/workspace";

const rsvpTone: Record<RsvpStatus, "gray" | "green" | "red" | "amber"> = {
  pending: "gray",
  yes: "green",
  no: "red",
  maybe: "amber",
};

export default function MeetingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const userId = useUserId();
  const qc = useQueryClient();
  const { data: role } = useMyRole(workspaceId);
  const rsvpMutation = useRsvp(workspaceId);

  const meetingQ = useQuery({
    queryKey: ["meeting", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meetings")
        .select(
          "*, meeting_attendees(user_id, rsvp, profiles:profiles!meeting_attendees_user_id_fkey(full_name))",
        )
        .eq("id", id!)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  if (meetingQ.isLoading || !meetingQ.data) return <Loading />;
  const meeting = meetingQ.data;
  type AttendeeRow = (typeof meeting.meeting_attendees)[number] & {
    profiles?: { full_name: string } | null;
  };
  const attendees = meeting.meeting_attendees as AttendeeRow[];
  const mine = attendees.find((a) => a.user_id === userId);
  const isAdmin = role === "owner" || role === "admin";
  const canManage = isAdmin || meeting.created_by === userId;

  const setRsvp = async (rsvp: RsvpStatus) => {
    try {
      await rsvpMutation.mutateAsync({ meetingId: meeting.id, userId: userId!, rsvp });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onDelete = () => {
    Alert.alert("Delete meeting", `Delete "${meeting.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("meetings").delete().eq("id", meeting.id);
          if (error) {
            Alert.alert("Could not delete", error.message);
            return;
          }
          qc.invalidateQueries({ queryKey: ["meetings", workspaceId] });
          router.back();
        },
      },
    ]);
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString([], {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="flex-row items-center gap-3 px-4 py-2">
          <Pressable accessibilityLabel="Back" onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#6b7280" />
          </Pressable>
          <Text className="flex-1 text-lg font-bold text-gray-900 dark:text-gray-50" numberOfLines={1}>
            {meeting.title}
          </Text>
          {canManage ? (
            <Pressable accessibilityLabel="Delete meeting" onPress={onDelete}>
              <Ionicons name="trash-outline" size={22} color="#dc2626" />
            </Pressable>
          ) : null}
        </View>

        <ScrollView contentContainerClassName="px-4 pb-12">
          <Card className="mb-3">
            <Subtle>
              {fmt(meeting.starts_at)} → {fmt(meeting.ends_at)}
            </Subtle>
            {meeting.location ? <Subtle className="mt-1">{meeting.location}</Subtle> : null}
            {meeting.agenda ? (
              <Text className="mt-3 text-gray-800 dark:text-gray-200">{meeting.agenda}</Text>
            ) : null}
          </Card>

          {mine ? (
            <Card className="mb-3">
              <Text className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                Your RSVP
              </Text>
              <View className="flex-row gap-2">
                {(["yes", "maybe", "no"] as RsvpStatus[]).map((r) => (
                  <Button
                    key={r}
                    title={r}
                    variant={mine.rsvp === r ? "primary" : "secondary"}
                    onPress={() => setRsvp(r)}
                    className="flex-1"
                  />
                ))}
              </View>
            </Card>
          ) : null}

          <Text className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Attendees</Text>
          {attendees.map((a) => (
            <Card key={a.user_id} className="mb-2 flex-row items-center gap-3">
              <Avatar name={a.profiles?.full_name || "?"} size={32} />
              <Text className="flex-1 text-gray-900 dark:text-gray-100">
                {a.profiles?.full_name || "Unnamed"}
                {a.user_id === userId ? " (you)" : ""}
              </Text>
              <Badge text={a.rsvp} tone={rsvpTone[a.rsvp]} />
            </Card>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
