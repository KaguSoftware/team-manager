import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, View } from "react-native";
import { z } from "zod";
import { toast } from "@/components/Toast";
import { Button, Field, Screen, Subtle, Title } from "@/components/ui";
import { AUTH_REDIRECT_URL } from "@/lib/authLinks";
import { supabase } from "@/lib/supabase";
import { emailSchema } from "@/lib/validation";

const schema = z.object({ email: emailSchema });
type Form = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [busy, setBusy] = useState(false);
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: AUTH_REDIRECT_URL,
    });
    setBusy(false);
    if (error) {
      Alert.alert("Could not send reset email", error.message);
      return;
    }
    toast.success("We sent a password reset link. Check your inbox.");
    router.back();
  });

  return (
    <Screen>
      <View className="flex-1 justify-center px-6">
        <Title>Reset password</Title>
        <Subtle className="mb-6">We&apos;ll email you a reset link</Subtle>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <Field
              label="Email"
              value={value}
              onChangeText={onChange}
              autoCapitalize="none"
              keyboardType="email-address"
              error={formState.errors.email?.message}
            />
          )}
        />
        <Button title="Send reset link" onPress={onSubmit} loading={busy} className="mt-2" />
        <Button title="Back" variant="ghost" onPress={() => router.back()} className="mt-2" />
      </View>
    </Screen>
  );
}
