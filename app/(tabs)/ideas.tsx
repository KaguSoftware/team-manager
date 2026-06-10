import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Loading,
  Screen,
  Subtle,
  Title,
} from "@/components/ui";
import { statusTone, useIdeaMutations, useIdeas, useMyRole } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { ideaSchema } from "@/lib/validation";
import { useUserId } from "@/providers/AuthProvider";
import { useWorkspaceStore } from "@/stores/workspace";

export default function Ideas() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const userId = useUserId();
  const qc = useQueryClient();
  const { data: ideas, isLoading, refetch, isRefetching } = useIdeas(workspaceId);
  const { data: role } = useMyRole(workspaceId);
  const { vote } = useIdeaMutations(workspaceId);
  const canPost = role != null && role !== "client";

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [pitch, setPitch] = useState("");
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(
    () => [...(ideas ?? [])].sort((a, b) => b.idea_votes.length - a.idea_votes.length),
    [ideas],
  );

  const onCreate = async () => {
    const parsed = ideaSchema.safeParse({ title, pitch });
    if (!parsed.success) {
      Alert.alert("Check the form", parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("ideas").insert({
      workspace_id: workspaceId!,
      created_by: userId!,
      ...parsed.data,
    });
    setBusy(false);
    if (error) {
      Alert.alert("Could not post idea", error.message);
      return;
    }
    setTitle("");
    setPitch("");
    setCreating(false);
    qc.invalidateQueries({ queryKey: ["ideas", workspaceId] });
  };

  if (isLoading) return <Loading />;

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <FlatList
          data={sorted}
          keyExtractor={(i) => i.id}
          contentContainerClassName="px-4 pb-8 flex-grow"
          refreshing={isRefetching}
          onRefresh={refetch}
          ListHeaderComponent={
            <View className="mb-4 mt-2 flex-row items-center justify-between">
              <View>
                <Title>Ideas</Title>
                <Subtle>Pitch what we should build next</Subtle>
              </View>
              {canPost ? (
                <Pressable
                  accessibilityLabel="New idea"
                  onPress={() => setCreating(true)}
                  className="rounded-full bg-brand-600 p-2"
                >
                  <Ionicons name="add" size={22} color="#fff" />
                </Pressable>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="bulb-outline"
              title="No ideas yet"
              subtitle="Be the first to pitch something"
            />
          }
          renderItem={({ item }) => {
            const voted = item.idea_votes.some((v: { user_id: string }) => v.user_id === userId);
            return (
              <Link href={{ pathname: "/idea/[id]", params: { id: item.id } }} asChild>
                <Pressable>
                  <Card className="mb-2 flex-row items-center gap-3">
                    <Pressable
                      accessibilityLabel={voted ? "Remove vote" : "Vote"}
                      onPress={() =>
                        vote
                          .mutateAsync({ ideaId: item.id, userId: userId!, voted })
                          .catch((e) => Alert.alert("Vote failed", e.message))
                      }
                      className={`items-center rounded-xl px-3 py-2 ${
                        voted ? "bg-brand-600" : "bg-gray-100 dark:bg-gray-800"
                      }`}
                    >
                      <Ionicons
                        name="chevron-up"
                        size={18}
                        color={voted ? "#fff" : "#6b7280"}
                      />
                      <Text
                        className={`text-sm font-bold ${
                          voted ? "text-white" : "text-gray-700 dark:text-gray-200"
                        }`}
                      >
                        {item.idea_votes.length}
                      </Text>
                    </Pressable>
                    <View className="flex-1">
                      <Text
                        className="font-semibold text-gray-900 dark:text-gray-100"
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                      <Subtle>
                        by {(item as { profiles?: { full_name: string } | null }).profiles?.full_name || "former member"}
                      </Subtle>
                    </View>
                    <Badge
                      text={item.status.replace("_", " ")}
                      tone={statusTone[item.status]}
                    />
                  </Card>
                </Pressable>
              </Link>
            );
          }}
        />

        <Modal visible={creating} animationType="slide" transparent>
          <View className="flex-1 justify-end bg-black/40">
            <View className="rounded-t-3xl bg-surface-light p-6 pb-10 dark:bg-surface-dark">
              <Text className="mb-3 text-lg font-bold text-gray-900 dark:text-gray-100">
                Pitch an idea
              </Text>
              <Field label="Title" value={title} onChangeText={setTitle} maxLength={200} autoFocus />
              <Field
                label="Pitch"
                value={pitch}
                onChangeText={setPitch}
                multiline
                placeholder="What is it, who is it for, why now?"
                style={{ minHeight: 90, textAlignVertical: "top" }}
              />
              <Button title="Post idea" onPress={onCreate} loading={busy} />
              <Button title="Cancel" variant="ghost" onPress={() => setCreating(false)} />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Screen>
  );
}
