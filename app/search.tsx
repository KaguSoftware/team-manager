import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { Badge, Card, EmptyState, Screen, Subtle } from "@/components/ui";
import {
  statusTone,
  useIdeas,
  useMeetings,
  useProjects,
  useWorkspaceTasks,
} from "@/lib/queries";
import { ICON_MUTED } from "@/lib/theme";
import { useWorkspaceStore } from "@/stores/workspace";

type Tone = (typeof statusTone)[keyof typeof statusTone];

type Result = {
  id: string;
  title: string;
  subtitle?: string;
  tone?: Tone | null;
  status?: string;
  go: () => void;
};

type Group = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; items: Result[] };

const PER_GROUP = 12;

export default function SearchScreen() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const [query, setQuery] = useState("");

  const { data: tasks } = useWorkspaceTasks(workspaceId);
  const { data: projects } = useProjects(workspaceId);
  const { data: ideas } = useIdeas(workspaceId);
  const { data: meetings } = useMeetings(workspaceId);

  const projectName = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects ?? []) m.set(p.id, p.name);
    return m;
  }, [projects]);

  const groups = useMemo<Group[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    const has = (s: string | null | undefined) => (s ?? "").toLowerCase().includes(q);

    const taskResults: Result[] = (tasks ?? [])
      .filter((t) => has(t.title))
      .slice(0, PER_GROUP)
      .map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: projectName.get(t.project_id),
        tone: statusTone[t.status],
        status: t.status.replace("_", " "),
        go: () => router.push({ pathname: "/task/[id]", params: { id: t.id } }),
      }));

    const projectResults: Result[] = (projects ?? [])
      .filter((p) => has(p.name) || has(p.description))
      .slice(0, PER_GROUP)
      .map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: p.description || undefined,
        tone: statusTone[p.status],
        status: p.status.replace("_", " "),
        go: () => router.push({ pathname: "/project/[id]", params: { id: p.id } }),
      }));

    const ideaResults: Result[] = (ideas ?? [])
      .filter((i) => has(i.title) || has(i.pitch))
      .slice(0, PER_GROUP)
      .map((i) => ({
        id: i.id,
        title: i.title,
        subtitle: i.pitch || undefined,
        tone: statusTone[i.status],
        status: i.status.replace("_", " "),
        go: () => router.push({ pathname: "/idea/[id]", params: { id: i.id } }),
      }));

    const meetingResults: Result[] = (meetings ?? [])
      .filter((m) => has(m.title) || has(m.location) || has(m.agenda))
      .slice(0, PER_GROUP)
      .map((m) => ({
        id: m.id,
        title: m.title,
        subtitle: new Date(m.starts_at).toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        go: () => router.push({ pathname: "/meeting/[id]", params: { id: m.id } }),
      }));

    const out: Group[] = [
      { key: "tasks", label: "Tasks", icon: "checkbox-outline", items: taskResults },
      { key: "projects", label: "Projects", icon: "folder-outline", items: projectResults },
      { key: "ideas", label: "Ideas", icon: "bulb-outline", items: ideaResults },
      { key: "meetings", label: "Meetings", icon: "calendar-outline", items: meetingResults },
    ];
    return out.filter((g) => g.items.length > 0);
  }, [query, tasks, projects, ideas, meetings, projectName]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const hasQuery = query.trim().length >= 1;

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="flex-row items-center gap-2 px-4 py-2">
          <Pressable accessibilityLabel="Back" onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color={ICON_MUTED} />
          </Pressable>
          <View className="flex-1 flex-row items-center gap-2 rounded-xl bg-gray-100 px-3 dark:bg-gray-800">
            <Ionicons name="search-outline" size={18} color={ICON_MUTED} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={setQuery}
              placeholder="Search tasks, projects, ideas…"
              placeholderTextColor="#9ca3af"
              returnKeyType="search"
              className="h-11 flex-1 text-base text-gray-900 dark:text-gray-100"
              style={{ paddingVertical: 0 }}
            />
            {query.length > 0 ? (
              <Pressable accessibilityLabel="Clear" onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={18} color={ICON_MUTED} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {!hasQuery ? (
          <EmptyState
            icon="search-outline"
            title="Search your workspace"
            subtitle="Find any task, project, idea, or meeting by name"
          />
        ) : total === 0 ? (
          <EmptyState icon="sad-outline" title="No matches" subtitle={`Nothing matches “${query.trim()}”`} />
        ) : (
          <ScrollView contentContainerClassName="px-4 pb-12" keyboardShouldPersistTaps="handled">
            {groups.map((g) => (
              <View key={g.key} className="mb-4">
                <View className="mb-2 mt-1 flex-row items-center gap-2">
                  <Ionicons name={g.icon} size={15} color={ICON_MUTED} />
                  <Text className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {g.label} · {g.items.length}
                  </Text>
                </View>
                {g.items.map((r) => (
                  <AnimatedPressable key={r.id} onPress={r.go}>
                    <Card className="mb-2 flex-row items-center gap-3">
                      <View className="flex-1">
                        <Text
                          className="font-semibold text-gray-900 dark:text-gray-100"
                          numberOfLines={1}
                        >
                          {r.title}
                        </Text>
                        {r.subtitle ? <Subtle className="mt-0.5">{r.subtitle}</Subtle> : null}
                      </View>
                      {r.status && r.tone ? <Badge text={r.status} tone={r.tone} /> : null}
                      <Ionicons name="chevron-forward" size={18} color={ICON_MUTED} />
                    </Card>
                  </AnimatedPressable>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Screen>
  );
}
