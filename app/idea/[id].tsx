import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "@/components/Toast";
import { Avatar, Badge, Button, Card, Loading, Screen, Subtle } from "@/components/ui";
import type { IdeaStatus } from "@/lib/database.types";
import { statusTone, useIdeaMutations, useMyRole } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { accentFg, ICON_MUTED } from "@/lib/theme";
import { commentSchema } from "@/lib/validation";
import { useUserId } from "@/providers/AuthProvider";
import { useWorkspaceStore } from "@/stores/workspace";

const allStatuses: IdeaStatus[] = ["proposed", "under_review", "approved", "rejected"];

export default function IdeaDetail() {
  const scheme = useColorScheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const userId = useUserId();
  const qc = useQueryClient();
  const { data: role } = useMyRole(workspaceId);
  const { vote, setStatus } = useIdeaMutations(workspaceId);
  const isAdmin = role === "owner" || role === "admin";
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);

  const ideaQ = useQuery({
    queryKey: ["idea", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ideas")
        .select(
          "*, idea_votes(user_id), profiles:profiles!ideas_created_by_fkey(full_name), idea_comments(id, body, created_at, created_by, profiles:profiles!idea_comments_created_by_fkey(full_name))",
        )
        .eq("id", id!)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  if (ideaQ.isLoading || !ideaQ.data) return <Loading />;
  const idea = ideaQ.data;
  const voted = idea.idea_votes.some((v: { user_id: string }) => v.user_id === userId);
  const comments = [...idea.idea_comments].sort((a, b) =>
    a.created_at.localeCompare(b.created_at),
  );

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["idea", id] });
    qc.invalidateQueries({ queryKey: ["ideas", workspaceId] });
  };

  const onVote = () =>
    vote
      .mutateAsync({ ideaId: idea.id, userId: userId!, voted })
      .catch((e) => Alert.alert("Vote failed", e.message));

  const onSetStatus = (s: IdeaStatus) =>
    setStatus
      .mutateAsync({ ideaId: idea.id, status: s })
      .then(refresh)
      .catch((e) => Alert.alert("Could not change status", e.message));

  const startEdit = (c: { id: string; body: string }) => {
    setEditing({ id: c.id, body: c.body });
    setComment(c.body);
  };

  const cancelEdit = () => {
    setEditing(null);
    setComment("");
  };

  const onCommentAction = (c: { id: string; body: string }) => {
    Alert.alert("Comment", undefined, [
      { text: "Edit", onPress: () => startEdit(c) },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          Alert.alert("Delete comment", "Delete this comment?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                const { error } = await supabase
                  .from("idea_comments")
                  .delete()
                  .eq("id", c.id);
                if (error) {
                  toast.error(error.message);
                  return;
                }
                if (editing?.id === c.id) cancelEdit();
                refresh();
                toast.success("Comment deleted");
              },
            },
          ]),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const onComment = async () => {
    const parsed = commentSchema.safeParse({ body: comment });
    if (!parsed.success) return;
    setPosting(true);

    if (editing) {
      const editId = editing.id;
      const { data, error } = await supabase
        .from("idea_comments")
        .update({ body: parsed.data.body })
        .eq("id", editId)
        .select("id");
      if (error) {
        setPosting(false);
        toast.error(error.message);
        return;
      }
      // No UPDATE policy may be applied: if nothing came back, fall back to
      // delete-then-insert (the comment moves to the bottom — acceptable).
      if (!data || data.length === 0) {
        const { error: delErr } = await supabase
          .from("idea_comments")
          .delete()
          .eq("id", editId);
        if (delErr) {
          setPosting(false);
          toast.error(delErr.message);
          return;
        }
        const { error: insErr } = await supabase.from("idea_comments").insert({
          idea_id: idea.id,
          created_by: userId!,
          body: parsed.data.body,
        });
        if (insErr) {
          setPosting(false);
          toast.error(insErr.message);
          return;
        }
      }
      setPosting(false);
      cancelEdit();
      refresh();
      toast.success("Comment updated");
      return;
    }

    const { error } = await supabase.from("idea_comments").insert({
      idea_id: idea.id,
      created_by: userId!,
      body: parsed.data.body,
    });
    setPosting(false);
    if (error) {
      Alert.alert("Could not comment", error.message);
      return;
    }
    setComment("");
    refresh();
  };

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
            <Text
              className="flex-1 text-lg font-bold text-gray-900 dark:text-gray-50"
              numberOfLines={1}
            >
              Idea
            </Text>
            <Badge text={idea.status.replace("_", " ")} tone={statusTone[idea.status]} />
          </View>

          <ScrollView contentContainerClassName="px-4 pb-4">
            <Card className="mb-3">
              <Text className="text-xl font-bold text-gray-900 dark:text-gray-50">
                {idea.title}
              </Text>
              <Subtle className="mb-2">
                by {(idea as { profiles?: { full_name: string } | null }).profiles?.full_name || "former member"}
              </Subtle>
              {idea.pitch ? (
                <Text className="text-gray-800 dark:text-gray-200">{idea.pitch}</Text>
              ) : null}
              <View className="mt-3 flex-row items-center gap-3">
                <Button
                  title={voted ? `Voted · ${idea.idea_votes.length}` : `Vote · ${idea.idea_votes.length}`}
                  variant={voted ? "primary" : "secondary"}
                  onPress={onVote}
                />
              </View>
            </Card>

            {isAdmin ? (
              <Card className="mb-3">
                <Text className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                  Set status
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {allStatuses.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => onSetStatus(s)}
                      className={`rounded-full px-3 py-1.5 ${
                        idea.status === s
                          ? "bg-ink-950 active:bg-ink-800 dark:bg-ink-100 dark:active:bg-ink-300"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    >
                      <Text
                        className={`text-sm font-medium capitalize ${
                          idea.status === s ? "text-white dark:text-ink-950" : "text-gray-700 dark:text-gray-200"
                        }`}
                      >
                        {s.replace("_", " ")}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Card>
            ) : null}

            <Text className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
              Discussion ({comments.length})
            </Text>
            {comments.map((c) => {
              const own = c.created_by === userId;
              return (
                <Card key={c.id} className="mb-2">
                  <View className="flex-row items-center gap-2">
                    <Avatar
                      name={(c as { profiles?: { full_name: string } | null }).profiles?.full_name || "?"}
                      size={26}
                    />
                    <Subtle>
                      {(c as { profiles?: { full_name: string } | null }).profiles?.full_name || "former member"}
                      {" · "}
                      {new Date(c.created_at).toLocaleDateString()}
                    </Subtle>
                    {own ? (
                      <Pressable
                        accessibilityLabel="Comment options"
                        hitSlop={8}
                        onPress={() => onCommentAction({ id: c.id, body: c.body })}
                        className="ml-auto p-1"
                      >
                        <Ionicons name="ellipsis-horizontal" size={18} color={ICON_MUTED} />
                      </Pressable>
                    ) : null}
                  </View>
                  <Text className="mt-1 text-gray-800 dark:text-gray-200">{c.body}</Text>
                </Card>
              );
            })}
          </ScrollView>

          <View className="flex-row items-center gap-2 border-t border-gray-200 px-4 py-2 dark:border-gray-800">
            {editing ? (
              <Pressable accessibilityLabel="Cancel edit" hitSlop={8} onPress={cancelEdit} className="p-1">
                <Ionicons name="close" size={22} color={ICON_MUTED} />
              </Pressable>
            ) : null}
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder={editing ? "Edit comment…" : "Add a comment…"}
              placeholderTextColor="#9ca3af"
              className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
              maxLength={4000}
            />
            <Pressable
              accessibilityLabel={editing ? "Update comment" : "Send comment"}
              onPress={onComment}
              disabled={posting || !comment.trim()}
              className={`rounded-full p-2.5 ${
                comment.trim()
                  ? "bg-ink-950 active:bg-ink-800 dark:bg-ink-100 dark:active:bg-ink-300"
                  : "bg-gray-300 dark:bg-gray-700"
              }`}
            >
              <Ionicons
                name={editing ? "checkmark" : "send"}
                size={18}
                color={accentFg(scheme)}
              />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Screen>
  );
}
