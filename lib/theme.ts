import type { ColorSchemeName } from "react-native";
import type { TaskStatus } from "./database.types";

// TS mirror of the `ink` scale in tailwind.config.js for places that need raw
// color values (SVG fills, calendar themes, ActivityIndicator, icons).
export const ink = {
  50: "#fafafa",
  100: "#f4f4f5",
  200: "#e4e4e7",
  300: "#d4d4d8",
  400: "#a1a1aa",
  500: "#71717a",
  600: "#52525b",
  700: "#3f3f46",
  800: "#27272a",
  900: "#18181b",
  950: "#0b0b0d",
} as const;

// Muted semantic colors stay for data meaning (status badges, Gantt bars,
// chart segments); everything interactive uses ink.
export const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: ink[400],
  in_progress: "#64748b",
  review: "#d97706",
  done: "#16a34a",
};

export const DANGER = "#dc2626";
export const ICON_MUTED = "#6b7280";

// High-contrast fill for primary interactive surfaces (FABs, selected chips)
// and the text/icon color that sits on top of it.
export const accent = (scheme: ColorSchemeName) =>
  scheme === "dark" ? ink[100] : ink[950];
export const accentFg = (scheme: ColorSchemeName) =>
  scheme === "dark" ? ink[950] : "#ffffff";
