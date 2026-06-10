import "../global.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Appearance, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/providers/AuthProvider";
import { useThemeStore } from "@/stores/theme";

export const unstable_settings = { anchor: "(tabs)" };

// Apply the saved appearance preference app-wide. "system" clears the override
// so the OS scheme is followed again.
function useAppearancePreference() {
  const pref = useThemeStore((s) => s.pref);
  useEffect(() => {
    Appearance.setColorScheme(pref === "system" ? null : pref);
  }, [pref]);
}

export default function RootLayout() {
  useAppearancePreference();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 15_000, retry: 1 } },
      }),
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                // explicit native transition: Android's default can stutter
                animation: Platform.OS === "android" ? "slide_from_right" : "default",
                animationDuration: 220,
              }}
            >
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="insights" />
              <Stack.Screen name="search" />
              <Stack.Screen name="task/new" options={{ presentation: "modal" }} />
              <Stack.Screen name="meeting/new" options={{ presentation: "modal" }} />
              <Stack.Screen name="settings" options={{ presentation: "modal" }} />
              <Stack.Screen name="notifications" options={{ presentation: "modal" }} />
            </Stack>
            <StatusBar style="auto" />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
