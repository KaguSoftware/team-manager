import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, useColorScheme, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "@/components/Toast";
import { Button, Card, Field, Screen, Subtle } from "@/components/ui";
import { tap } from "@/lib/haptics";
import { accentFg, ICON_MUTED } from "@/lib/theme";
import { clearPushToken, registerForPushNotifications } from "@/lib/push";
import { useMembers, useMyWorkspaces, useProfile, useWorkspaceMutations } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/providers/AuthProvider";
import { useThemeStore, type ThemePref } from "@/stores/theme";
import { useWorkspaceStore } from "@/stores/workspace";

const THEME_OPTIONS: { value: ThemePref; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "system", label: "System", icon: "phone-portrait-outline" },
  { value: "light", label: "Light", icon: "sunny-outline" },
  { value: "dark", label: "Dark", icon: "moon-outline" },
];

export default function Settings() {
  const userId = useUserId();
  const qc = useQueryClient();
  const { workspaceId, setWorkspaceId } = useWorkspaceStore();
  const { data: workspaces } = useMyWorkspaces();
  const { leaveWorkspace } = useWorkspaceMutations(workspaceId);
  const profileQ = useProfile(userId);
  const currentWorkspace = (workspaces ?? []).find((ws) => ws.id === workspaceId);
  const { data: members } = useMembers(workspaceId);
  const themePref = useThemeStore((s) => s.pref);
  const setThemePref = useThemeStore((s) => s.setPref);
  const scheme = useColorScheme();
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [mfaEnrolled, setMfaEnrolled] = useState<boolean | null>(null);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");

  useEffect(() => {
    if (profileQ.data) setName(profileQ.data.full_name);
  }, [profileQ.data]);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setMfaEnrolled((data?.totp ?? []).some((f) => f.status === "verified"));
    });
  }, []);

  const saveName = async () => {
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name.trim().slice(0, 120) })
      .eq("id", userId!);
    setSavingName(false);
    if (error) {
      Alert.alert("Could not save", error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["profile", userId] });
    qc.invalidateQueries({ queryKey: ["members"] });
    toast.success("Profile updated");
  };

  const startMfa = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error || !data) {
      Alert.alert("Could not start MFA setup", error?.message ?? "Unknown error");
      return;
    }
    setTotpFactorId(data.id);
    setTotpUri(data.totp.secret);
  };

  const verifyMfa = async () => {
    if (!totpFactorId) return;
    const challenge = await supabase.auth.mfa.challenge({ factorId: totpFactorId });
    if (challenge.error || !challenge.data) {
      Alert.alert("MFA error", challenge.error?.message ?? "Unknown error");
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId: totpFactorId,
      challengeId: challenge.data.id,
      code: totpCode.trim(),
    });
    if (error) {
      Alert.alert("Wrong code", error.message);
      return;
    }
    setMfaEnrolled(true);
    setTotpUri(null);
    setTotpFactorId(null);
    setTotpCode("");
    Alert.alert("MFA enabled", "Your authenticator app is now protecting this account.");
  };

  const onEnablePush = async () => {
    if (!userId) return;
    await registerForPushNotifications(userId);
    Alert.alert("Done", "If permission was granted, push notifications are active on this device.");
  };

  const onLeave = () => {
    Alert.alert("Leave workspace", "You will lose access until re-invited. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            await leaveWorkspace.mutateAsync();
            setWorkspaceId(null);
            router.replace("/onboarding");
          } catch (e) {
            Alert.alert("Could not leave", (e as Error).message);
          }
        },
      },
    ]);
  };

  const onSignOut = async () => {
    if (userId) await clearPushToken(userId);
    await supabase.auth.signOut();
    setWorkspaceId(null);
    qc.clear();
    router.replace("/(auth)/sign-in");
  };

  const onDeleteAccount = () => {
    Alert.alert(
      "Delete account",
      "This permanently deletes your account, profile, memberships and any workspaces where you are the only member. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete forever",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase.rpc("delete_account");
            if (error) {
              Alert.alert("Could not delete account", error.message);
              return;
            }
            await supabase.auth.signOut();
            setWorkspaceId(null);
            qc.clear();
            router.replace("/(auth)/sign-in");
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="flex-row items-center gap-3 px-4 py-2">
          <Pressable accessibilityLabel="Back" onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color="#6b7280" />
          </Pressable>
          <Text className="text-lg font-bold text-gray-900 dark:text-gray-50">Settings</Text>
        </View>

        <ScrollView contentContainerClassName="px-4 pb-12">
          <Card className="mb-3">
            <Text className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Profile</Text>
            <Field label="Full name" value={name} onChangeText={setName} maxLength={120} />
            <Button title="Save" onPress={saveName} loading={savingName} />
          </Card>

          <Card className="mb-3">
            <Text className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Appearance</Text>
            <View className="flex-row gap-2 rounded-xl bg-gray-200 p-1 dark:bg-gray-800">
              {THEME_OPTIONS.map((opt) => {
                const active = themePref === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      tap();
                      setThemePref(opt.value);
                    }}
                    className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg py-2 ${
                      active ? "bg-ink-950 dark:bg-ink-100" : ""
                    }`}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={16}
                      color={active ? accentFg(scheme) : ICON_MUTED}
                    />
                    <Text
                      className={`text-sm font-medium ${
                        active
                          ? "text-white dark:text-ink-950"
                          : "text-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Card className="mb-3">
            <Text className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
              Two-factor authentication
            </Text>
            {mfaEnrolled ? (
              <Subtle>Enabled with an authenticator app ✓</Subtle>
            ) : totpUri ? (
              <View>
                <Subtle className="mb-2">
                  Add this secret to your authenticator app (Google Authenticator, 1Password…),
                  then enter the 6-digit code:
                </Subtle>
                <Text selectable className="mb-2 font-mono text-xs text-gray-800 dark:text-gray-200">
                  {totpUri}
                </Text>
                <Field
                  label="6-digit code"
                  value={totpCode}
                  onChangeText={setTotpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <Button title="Verify & enable" onPress={verifyMfa} />
              </View>
            ) : (
              <View>
                <Subtle className="mb-2">
                  Protect your account with an authenticator app.
                </Subtle>
                <Button title="Set up MFA" variant="secondary" onPress={startMfa} />
              </View>
            )}
          </Card>

          <Card className="mb-3">
            <Text className="mb-2 font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </Text>
            <Button
              title="Enable push notifications on this device"
              variant="secondary"
              onPress={onEnablePush}
            />
          </Card>

          <Card className="mb-3">
            <Text className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Workspace</Text>
            {currentWorkspace ? (
              <Subtle className="mb-3">
                {currentWorkspace.name} · {members?.length ?? 0}{" "}
                {members?.length === 1 ? "member" : "members"}
              </Subtle>
            ) : null}
            {(workspaces ?? []).map((ws) => (
              <Button
                key={ws.id}
                title={`${ws.id === workspaceId ? "✓ " : ""}${ws.name}`}
                variant="secondary"
                className="mb-2"
                onPress={() => {
                  setWorkspaceId(ws.id);
                  qc.clear();
                  router.replace("/(tabs)");
                }}
              />
            ))}
            <Button
              title="Create or join another workspace"
              variant="ghost"
              onPress={() => router.push("/onboarding")}
            />
            <Button title="Leave current workspace" variant="ghost" onPress={onLeave} />
          </Card>

          <Card>
            <Text className="mb-2 font-semibold text-gray-900 dark:text-gray-100">Account</Text>
            <Button title="Sign out" variant="secondary" onPress={onSignOut} className="mb-2" />
            <Button title="Delete account" variant="danger" onPress={onDeleteAccount} />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
