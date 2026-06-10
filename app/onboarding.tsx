import { router } from "expo-router";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { KaguLogo } from "@/components/KaguLogo";
import { Button, Card, Field, Screen, Subtle, Title } from "@/components/ui";
import { useMyWorkspaces, useWorkspaceMutations } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useWorkspaceStore } from "@/stores/workspace";

export default function Onboarding() {
  const { session } = useAuth();
  const setWorkspaceId = useWorkspaceStore((s) => s.setWorkspaceId);
  const { data: workspaces } = useMyWorkspaces();
  const { createWorkspace, acceptInvite } = useWorkspaceMutations(null);
  const [name, setName] = useState("");
  const [token, setToken] = useState("");

  if (!session) {
    router.replace("/(auth)/sign-in");
    return null;
  }

  const enter = (id: string) => {
    setWorkspaceId(id);
    router.replace("/(tabs)");
  };

  const onCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Name required", "Give your workspace a name.");
      return;
    }
    try {
      const id = await createWorkspace.mutateAsync(trimmed);
      if (id) enter(id);
    } catch (e) {
      Alert.alert("Could not create workspace", (e as Error).message);
    }
  };

  const onJoin = async () => {
    if (!token.trim()) {
      Alert.alert("Code required", "Paste the invite code you received.");
      return;
    }
    try {
      const id = await acceptInvite.mutateAsync(token);
      if (id) enter(id);
    } catch (e) {
      Alert.alert("Could not join", (e as Error).message);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-12"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-6 items-center">
            <KaguLogo size={56} />
          </View>
          <Title>Set up your team</Title>
          <Subtle className="mb-6">Create a workspace or join one with an invite code</Subtle>

          {workspaces && workspaces.length > 0 ? (
            <Card className="mb-4">
              <Text className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
                Your workspaces
              </Text>
              {workspaces.map((ws) => (
                <Button
                  key={ws.id}
                  title={ws.name}
                  variant="secondary"
                  onPress={() => enter(ws.id)}
                  className="mb-2"
                />
              ))}
            </Card>
          ) : null}

          <Card className="mb-4">
            <Text className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
              Create a workspace
            </Text>
            <Field
              label="Workspace name"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Kagu"
              maxLength={80}
            />
            <Button title="Create" onPress={onCreate} loading={createWorkspace.isPending} />
          </Card>

          <Card>
            <Text className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
              Join with invite code
            </Text>
            <Field
              label="Invite code"
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              placeholder="Paste the code from your admin"
            />
            <Button
              title="Join workspace"
              variant="secondary"
              onPress={onJoin}
              loading={acceptInvite.isPending}
            />
          </Card>

          <Button
            title="Sign out"
            variant="ghost"
            className="mt-6"
            onPress={() => supabase.auth.signOut()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
