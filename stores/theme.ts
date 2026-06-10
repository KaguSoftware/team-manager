import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// User's appearance preference. "system" follows the OS; the others force a
// scheme. Applied app-wide via Appearance.setColorScheme in the root layout.
export type ThemePref = "system" | "light" | "dark";

type ThemeState = {
  pref: ThemePref;
  setPref: (pref: ThemePref) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      pref: "system",
      setPref: (pref) => set({ pref }),
    }),
    { name: "kagu-theme", storage: createJSONStorage(() => AsyncStorage) },
  ),
);
