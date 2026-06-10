import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { success as successHaptic, tap } from "@/lib/haptics";

type ToastKind = "success" | "error";
type ToastState = { id: number; kind: ToastKind; message: string };

let show: ((kind: ToastKind, message: string) => void) | null = null;

// Imperative API so mutation callbacks can fire toasts without context
// plumbing. Use for success/info feedback only — destructive confirmations
// stay as Alert.alert.
export const toast = {
  success(message: string) {
    show?.("success", message);
  },
  error(message: string) {
    show?.("error", message);
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    show = (kind, message) => {
      if (timer.current) clearTimeout(timer.current);
      (kind === "success" ? successHaptic : tap)();
      setCurrent({ id: Date.now(), kind, message });
      timer.current = setTimeout(() => setCurrent(null), 2500);
    };
    return () => {
      show = null;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {current ? (
        <Animated.View
          key={current.id}
          entering={FadeInDown.springify().damping(18)}
          exiting={FadeOutUp.duration(150)}
          pointerEvents="none"
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          <View className="flex-row items-center gap-2 rounded-full bg-ink-900 px-4 py-2.5 shadow-lg dark:bg-ink-100">
            <Ionicons
              name={current.kind === "success" ? "checkmark-circle" : "alert-circle"}
              size={18}
              color={current.kind === "success" ? "#16a34a" : "#dc2626"}
            />
            <Text className="text-sm font-medium text-white dark:text-ink-950">
              {current.message}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}
