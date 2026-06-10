import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { AUTH_REDIRECT_URL, handleAuthUrl } from "@/lib/authLinks";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

async function signInWithApple() {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) throw new Error("No identity token returned");

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
    });
    if (error) throw error;

    // Apple only provides the name on the very first authorization — persist it
    const name = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(" ");
    if (name && data.user) {
      await supabase.from("profiles").update({ full_name: name }).eq("id", data.user.id);
    }
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "ERR_REQUEST_CANCELED") return; // user dismissed the sheet
    Alert.alert("Apple sign-in failed", err.message ?? "Unknown error");
  }
}

async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: AUTH_REDIRECT_URL, skipBrowserRedirect: true },
    });
    if (error || !data.url) throw error ?? new Error("No auth URL returned");

    const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_REDIRECT_URL);
    if (result.type === "success") {
      await handleAuthUrl(result.url);
    }
  } catch (e) {
    Alert.alert("Google sign-in failed", (e as Error).message);
  }
}

export function SocialAuth() {
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  return (
    <View className="mt-6">
      <View className="mb-4 flex-row items-center gap-3">
        <View className="h-px flex-1 bg-gray-300 dark:bg-gray-700" />
        <Text className="text-xs text-gray-400">or continue with</Text>
        <View className="h-px flex-1 bg-gray-300 dark:bg-gray-700" />
      </View>

      {appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={12}
          style={{ height: 48, marginBottom: 10 }}
          onPress={signInWithApple}
        />
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign in with Google"
        onPress={signInWithGoogle}
        className="flex-row items-center justify-center gap-2 rounded-xl border border-gray-300 bg-surface-light py-3 active:opacity-80 dark:border-gray-700 dark:bg-surface-dark"
      >
        <Ionicons name="logo-google" size={18} color="#ea4335" />
        <Text className="font-semibold text-gray-800 dark:text-gray-100">
          Sign in with Google
        </Text>
      </Pressable>
    </View>
  );
}
