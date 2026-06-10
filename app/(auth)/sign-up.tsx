import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { z } from "zod";
import { Button, Field, Screen, Subtle, Title } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { signUpSchema } from "@/lib/validation";

type Form = z.infer<typeof signUpSchema>;

export default function SignUp() {
  const [busy, setBusy] = useState(false);
  const { control, handleSubmit, formState } = useForm<Form>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "", confirm: "" },
  });

  const onSubmit = handleSubmit(async ({ fullName, email, password }) => {
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setBusy(false);
    if (error) {
      Alert.alert("Sign up failed", error.message);
      return;
    }
    if (!data.session) {
      Alert.alert(
        "Confirm your email",
        "We sent you a confirmation link. Open it, then sign in.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/sign-in") }],
      );
    }
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
            <Title>Create your account</Title>
            <Subtle>Then create a workspace or join your team</Subtle>
          </View>

          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, value } }) => (
              <Field
                label="Full name"
                value={value}
                onChangeText={onChange}
                autoComplete="name"
                error={formState.errors.fullName?.message}
              />
            )}
          />
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
                label="Password (min 12 characters)"
                value={value}
                onChangeText={onChange}
                secureTextEntry
                autoComplete="new-password"
                error={formState.errors.password?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="confirm"
            render={({ field: { onChange, value } }) => (
              <Field
                label="Confirm password"
                value={value}
                onChangeText={onChange}
                secureTextEntry
                autoComplete="new-password"
                error={formState.errors.confirm?.message}
              />
            )}
          />

          <Button title="Create account" onPress={onSubmit} loading={busy} className="mt-2" />

          <View className="mt-6 flex-row justify-center gap-1">
            <Text className="text-gray-500 dark:text-gray-400">Already have an account?</Text>
            <Link href="/(auth)/sign-in" className="font-semibold text-brand-600">
              Sign in
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
