import { router } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";
import { Button, Field, Screen, Subtle, Title } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { passwordSchema } from "@/lib/validation";

// Reached via the password-recovery email deep link (AuthProvider routes
// here on the "recovery" auth event, with the recovery session installed).
export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      Alert.alert("Weak password", parsed.error.issues[0].message);
      return;
    }
    if (password !== confirm) {
      Alert.alert("Check the form", "Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      Alert.alert("Could not update password", error.message);
      return;
    }
    Alert.alert("Password updated", "You are signed in.", [
      { text: "OK", onPress: () => router.replace("/") },
    ]);
  };

  return (
    <Screen>
      <View className="flex-1 justify-center px-6">
        <Title>Choose a new password</Title>
        <Subtle className="mb-6">Minimum 12 characters</Subtle>
        <Field
          label="New password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        <Field
          label="Confirm new password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoComplete="new-password"
        />
        <Button title="Update password" onPress={onSubmit} loading={busy} className="mt-2" />
      </View>
    </Screen>
  );
}
