import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { SkeletonList } from "@/components/Skeleton";
import { toast } from "@/components/Toast";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Screen,
  Subtle,
  Title,
} from "@/components/ui";
import { statusTone, useMyRole, useProjects } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { accentFg } from "@/lib/theme";
import { useUserId } from "@/providers/AuthProvider";
import { useWorkspaceStore } from "@/stores/workspace";

const palette = ["#64748b", "#16a34a", "#d97706", "#dc2626", "#9333ea", "#0d9488"];

export default function Projects() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const userId = useUserId();
  const qc = useQueryClient();
  const scheme = useColorScheme();
  const { data: role } = useMyRole(workspaceId);
  const { data: projects, isLoading, refetch, isRefetching } = useProjects(workspaceId);
  const isAdmin = role === "owner" || role === "admin";

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(palette[0]);
  const [busy, setBusy] = useState(false);

  const onCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Name required", "Give the project a name.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("projects").insert({
      workspace_id: workspaceId!,
      name: name.trim(),
      color,
      created_by: userId!,
    });
    setBusy(false);
    if (error) {
      Alert.alert("Could not create project", error.message);
      return;
    }
    setName("");
    setCreating(false);
    qc.invalidateQueries({ queryKey: ["projects", workspaceId] });
    toast.success("Project created");
  };

  if (isLoading)
    return (
      <Screen>
        <SafeAreaView className="flex-1 px-4" edges={["top"]}>
          <View className="mb-4 mt-2">
            <Title>Projects</Title>
          </View>
          <SkeletonList />
        </SafeAreaView>
      </Screen>
    );

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <FlatList
          data={projects ?? []}
          keyExtractor={(p) => p.id}
          contentContainerClassName="px-4 pb-8 flex-grow"
          refreshing={isRefetching}
          onRefresh={refetch}
          ListHeaderComponent={
            <View className="mb-4 mt-2 flex-row items-center justify-between">
              <Title>Projects</Title>
              {isAdmin ? (
                <AnimatedPressable
                  accessibilityLabel="New project"
                  onPress={() => setCreating(true)}
                  className="rounded-full bg-ink-950 p-2 active:bg-ink-800 dark:bg-ink-100 dark:active:bg-ink-300"
                >
                  <Ionicons name="add" size={22} color={accentFg(scheme)} />
                </AnimatedPressable>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="folder-open-outline"
              title="No projects yet"
              subtitle={isAdmin ? "Tap + to create the first project" : "Projects will appear here"}
            />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index * 40, 320))}>
            <Link href={{ pathname: "/project/[id]", params: { id: item.id } }} asChild>
              <Pressable>
                <Card className="mb-2">
                  <View className="flex-row items-center gap-3">
                    <View
                      style={{ backgroundColor: item.color }}
                      className="h-3.5 w-3.5 rounded-full"
                    />
                    <Text className="flex-1 font-semibold text-gray-900 dark:text-gray-100">
                      {item.name}
                    </Text>
                    <Badge text={item.status.replace("_", " ")} tone={statusTone[item.status]} />
                  </View>
                  {item.start_date || item.end_date ? (
                    <Subtle className="mt-1">
                      {item.start_date ?? "…"} → {item.end_date ?? "…"}
                    </Subtle>
                  ) : null}
                </Card>
              </Pressable>
            </Link>
            </Animated.View>
          )}
        />

        <Modal visible={creating} animationType="slide" transparent>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 justify-end bg-black/40"
          >
            <View className="rounded-t-3xl bg-surface-light p-6 pb-10 dark:bg-surface-dark">
              <Text className="mb-3 text-lg font-bold text-gray-900 dark:text-gray-100">
                New project
              </Text>
              <Field label="Name" value={name} onChangeText={setName} maxLength={120} autoFocus />
              <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Color
              </Text>
              <View className="mb-4 flex-row gap-2">
                {palette.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`h-8 w-8 rounded-full ${color === c ? "border-2 border-gray-900 dark:border-white" : ""}`}
                  />
                ))}
              </View>
              <Button title="Create project" onPress={onCreate} loading={busy} />
              <Button title="Cancel" variant="ghost" onPress={() => setCreating(false)} />
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </Screen>
  );
}
