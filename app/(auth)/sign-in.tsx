import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { z } from "zod";
import { Button, Field, Screen, Subtle, Title } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { signInSchema } from "@/lib/validation";

type Form = z.infer<typeof signInSchema>;

export default function SignIn() {
  const [busy, setBusy] = useState(false);
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) Alert.alert("Sign in failed", error.message);
    // success: AuthProvider session change redirects via app/index
  });

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
          <View className="mb-8">
            <Title>Welcome back</Title>
            <Subtle>Sign in to your team workspace</Subtle>
          </View>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Field
                label="Email"
                value={value}
                onChangeText={onChange}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                error={formState.errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <Field
                label="Password"
                value={value}
                onChangeText={onChange}
                secureTextEntry
                autoComplete="current-password"
                error={formState.errors.password?.message}
              />
            )}
          />

          <Button title="Sign in" onPress={onSubmit} loading={busy} className="mt-2" />

          <View className="mt-6 flex-row justify-center gap-1">
            <Text className="text-gray-500 dark:text-gray-400">New here?</Text>
            <Link href="/(auth)/sign-up" className="font-semibold text-brand-600">
              Create an account
            </Link>
          </View>
          <View className="mt-2 flex-row justify-center">
            <Link href="/(auth)/forgot-password" className="text-sm text-gray-500">
              Forgot your password?
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
