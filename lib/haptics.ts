import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Fire-and-forget haptics; no-ops on web where expo-haptics throws.
export function tap() {
  if (Platform.OS === "web") return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function success() {
  if (Platform.OS === "web") return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
