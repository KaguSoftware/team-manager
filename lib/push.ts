import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Ask permission and store the Expo push token on the user's own profile
 * (RLS only lets a user write their own row). Safe to call on every launch;
 * exits quietly when permission is denied or on simulators.
 */
export async function registerForPushNotifications(userId: string) {
  try {
    if (!Device.isDevice) return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== "granted") {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== "granted") return;

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    await supabase.from("profiles").update({ expo_push_token: token }).eq("id", userId);
  } catch {
    // push is best-effort; never block the app on it
  }
}

export async function clearPushToken(userId: string) {
  try {
    await supabase.from("profiles").update({ expo_push_token: null }).eq("id", userId);
  } catch {
    // ignore
  }
}
