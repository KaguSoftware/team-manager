import { useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Field,
  Loading,
  Screen,
  Subtle,
  Title,
} from "@/components/ui";
import type { MemberRole } from "@/lib/database.types";
import {
  useMembers,
  useMyRole,
  usePendingInvites,
  useWorkspaceMutations,
  type MemberWithProfile,
} from "@/lib/queries";
import { emailSchema } from "@/lib/validation";
import { useUserId } from "@/providers/AuthProvider";
import { useWorkspaceStore } from "@/stores/workspace";

const roleTone: Record<MemberRole, "purple" | "blue" | "gray" | "amber"> = {
  owner: "purple",
  admin: "blue",
  member: "gray",
  client: "amber",
};

export default function Team() {
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const userId = useUserId();
  const { data: role } = useMyRole(workspaceId);
  const { data: members, isLoading } = useMembers(workspaceId);
  const isAdmin = role === "owner" || role === "admin";
  const { data: invites } = usePendingInvites(workspaceId, isAdmin);
  const { createInvite, changeRole, removeMember } = useWorkspaceMutations(workspaceId);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("member");

  const onInvite = async () => {
    const parsed = emailSchema.safeParse(inviteEmail);
    if (!parsed.success) {
      Alert.alert("Invalid email", parsed.error.issues[0].message);
      return;
    }
    try {
      const token = await createInvite.mutateAsync({ email: parsed.data, role: inviteRole });
      setInviteEmail("");
      Alert.alert(
        "Invite created",
        `Send this one-time code to ${parsed.data} (valid 72h):\n\n${token}\n\nThey enter it under "Join with invite code" after signing up with that exact email.`,
      );
    } catch (e) {
      Alert.alert("Could not invite", (e as Error).message);
    }
  };

  const onMemberPress = (m: MemberWithProfile) => {
    if (!isAdmin || m.user_id === userId) return;
    const name = m.profiles?.full_name || "this member";
    const options: { text: string; onPress?: () => void; style?: "destructive" | "cancel" }[] = [];
    (["admin", "member", "client"] as MemberRole[])
      .filter((r) => r !== m.role)
      .forEach((r) =>
        options.push({
          text: `Make ${r}`,
          onPress: () =>
            changeRole
              .mutateAsync({ userId: m.user_id, role: r })
              .catch((e) => Alert.alert("Could not change role", e.message)),
        }),
      );
    options.push({
      text: "Remove from workspace",
      style: "destructive",
      onPress: () =>
        Alert.alert("Remove member", `Remove ${name} from the workspace?`, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () =>
              removeMember
                .mutateAsync(m.user_id)
                .catch((e) => Alert.alert("Could not remove", e.message)),
          },
        ]),
    });
    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert(name, `Role: ${m.role}`, options);
  };

  if (isLoading) return <Loading />;

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <FlatList
          data={members ?? []}
          keyExtractor={(m) => m.user_id}
          contentContainerClassName="px-4 pb-8"
          ListHeaderComponent={
            <View className="mb-4 mt-2">
              <Title>Team</Title>
              <Subtle>
                {members?.length ?? 0} member{(members?.length ?? 0) === 1 ? "" : "s"}
                {role ? ` · you are ${role}` : ""}
              </Subtle>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => onMemberPress(item)}>
              <Card className="mb-2 flex-row items-center gap-3">
                <Avatar name={item.profiles?.full_name || "?"} />
                <View className="flex-1">
                  <Text className="font-semibold text-gray-900 dark:text-gray-100">
                    {item.profiles?.full_name || "Unnamed"}
                    {item.user_id === userId ? " (you)" : ""}
                  </Text>
                </View>
                <Badge text={item.role} tone={roleTone[item.role]} />
              </Card>
            </Pressable>
          )}
          ListFooterComponent={
            isAdmin ? (
              <View className="mt-4">
                <Card>
                  <Text className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                    Invite someone
                  </Text>
                  <Field
                    label="Email"
                    value={inviteEmail}
                    onChangeText={setInviteEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="teammate@company.com"
                  />
                  <View className="mb-3 flex-row gap-2">
                    {(["admin", "member", "client"] as MemberRole[]).map((r) => (
                      <Pressable
                        key={r}
                        onPress={() => setInviteRole(r)}
                        className={`rounded-full px-3 py-1.5 ${
                          inviteRole === r ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      >
                        <Text
                          className={`text-sm font-medium capitalize ${
                            inviteRole === r ? "text-white" : "text-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {r}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Button
                    title="Create invite code"
                    onPress={onInvite}
                    loading={createInvite.isPending}
                  />
                </Card>

                {(invites ?? []).length > 0 ? (
                  <Card className="mt-4">
                    <Text className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                      Pending invites
                    </Text>
                    {(invites ?? []).map((inv) => (
                      <View key={inv.id} className="mb-1 flex-row items-center justify-between">
                        <Text className="flex-1 text-gray-700 dark:text-gray-300" numberOfLines={1}>
                          {inv.email}
                        </Text>
                        <Badge text={inv.role} tone={roleTone[inv.role]} />
                      </View>
                    ))}
                  </Card>
                ) : null}
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </Screen>
  );
}
