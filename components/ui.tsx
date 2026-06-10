import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  useColorScheme,
  View,
  type TextInputProps,
} from "react-native";
import { tap } from "@/lib/haptics";
import { accentFg } from "@/lib/theme";

export function Screen({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <View className={`flex-1 bg-canvas-light dark:bg-canvas-dark ${className ?? ""}`}>
      {children}
    </View>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <View
      className={`rounded-2xl bg-surface-light p-4 shadow-sm dark:bg-surface-dark ${className ?? ""}`}
    >
      {children}
    </View>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-2xl font-bold text-gray-900 dark:text-gray-50">{children}</Text>
  );
}

export function Subtle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <Text className={`text-sm text-gray-500 dark:text-gray-400 ${className ?? ""}`}>
      {children}
    </Text>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
  className,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const scheme = useColorScheme();
  const base = "rounded-xl px-4 py-3 items-center justify-center flex-row";
  const styles = {
    primary: "bg-ink-950 active:bg-ink-800 dark:bg-ink-100 dark:active:bg-ink-300",
    secondary: "bg-gray-200 dark:bg-gray-700 active:opacity-80",
    danger: "bg-red-600 active:bg-red-700",
    ghost: "bg-transparent",
  }[variant];
  const textStyles = {
    primary: "text-white dark:text-ink-950 font-semibold",
    secondary: "text-gray-900 dark:text-gray-100 font-semibold",
    danger: "text-white font-semibold",
    ghost: "text-ink-900 dark:text-ink-100 font-semibold",
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      disabled={disabled || loading}
      className={`${base} ${styles} ${disabled || loading ? "opacity-50" : ""} ${className ?? ""}`}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "secondary" || variant === "ghost"
              ? undefined
              : variant === "primary"
                ? accentFg(scheme)
                : "#fff"
          }
        />
      ) : (
        <Text className={textStyles}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  error,
  multiline,
  style,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Text>
      <TextInput
        multiline={multiline}
        placeholderTextColor="#9ca3af"
        className={`rounded-xl border bg-surface-light px-4 text-base leading-5 text-gray-900 dark:bg-surface-dark dark:text-gray-100 ${
          multiline ? "py-3" : "h-12"
        } ${error ? "border-red-500" : "border-gray-200 dark:border-gray-700"}`}
        // Android TextInputs ship extra default vertical padding that fights
        // the fixed height; zero it and center the text instead.
        style={[
          multiline
            ? { textAlignVertical: "top" as const, minHeight: 88 }
            : { paddingVertical: 0, textAlignVertical: "center" as const },
          style,
        ]}
        {...props}
      />
      {error ? <Text className="mt-1 text-xs text-red-500">{error}</Text> : null}
    </View>
  );
}

// Keys are legacy tone names kept for consumer stability; values are the
// muted monochrome-era palette ("blue" renders slate, "purple" renders ink).
const badgeTones: Record<string, string> = {
  gray: "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200",
  blue: "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200",
  green: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200",
  amber: "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200",
  red: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200",
  purple: "bg-ink-200 dark:bg-ink-700 text-ink-700 dark:text-ink-200",
};

export function Badge({ text, tone = "gray" }: { text: string; tone?: keyof typeof badgeTones }) {
  const [bg, bgDark, textTone, textDark] = badgeTones[tone].split(" ");
  return (
    <View className={`self-start rounded-full px-2.5 py-0.5 ${bg} ${bgDark}`}>
      <Text className={`text-xs font-medium capitalize ${textTone} ${textDark}`}>{text}</Text>
    </View>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join(("")) || "?";
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="items-center justify-center bg-ink-200 dark:bg-ink-800"
    >
      <Text
        style={{ fontSize: size * 0.4 }}
        className="font-semibold text-ink-700 dark:text-ink-200"
      >
        {initials}
      </Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Ionicons name={icon} size={44} color="#9ca3af" />
      <Text className="mt-3 text-center text-lg font-semibold text-gray-700 dark:text-gray-200">
        {title}
      </Text>
      {subtitle ? (
        <Text className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function Loading() {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" />
    </View>
  );
}
