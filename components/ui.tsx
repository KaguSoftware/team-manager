import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

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
  const base = "rounded-xl px-4 py-3 items-center justify-center flex-row";
  const styles = {
    primary: "bg-brand-600 active:bg-brand-700",
    secondary: "bg-gray-200 dark:bg-gray-700 active:opacity-80",
    danger: "bg-red-600 active:bg-red-700",
    ghost: "bg-transparent",
  }[variant];
  const textStyles = {
    primary: "text-white font-semibold",
    secondary: "text-gray-900 dark:text-gray-100 font-semibold",
    danger: "text-white font-semibold",
    ghost: "text-brand-600 font-semibold",
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      className={`${base} ${styles} ${disabled || loading ? "opacity-50" : ""} ${className ?? ""}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" || variant === "ghost" ? undefined : "#fff"} />
      ) : (
        <Text className={textStyles}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</Text>
      <TextInput
        placeholderTextColor="#9ca3af"
        className={`rounded-xl border bg-surface-light px-4 py-3 text-base text-gray-900 dark:bg-surface-dark dark:text-gray-100 ${
          error ? "border-red-500" : "border-gray-200 dark:border-gray-700"
        }`}
        {...props}
      />
      {error ? <Text className="mt-1 text-xs text-red-500">{error}</Text> : null}
    </View>
  );
}

const badgeTones: Record<string, string> = {
  gray: "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200",
  blue: "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200",
  green: "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200",
  amber: "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200",
  red: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200",
  purple: "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200",
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
      className="items-center justify-center bg-brand-100 dark:bg-brand-900"
    >
      <Text
        style={{ fontSize: size * 0.4 }}
        className="font-semibold text-brand-700 dark:text-brand-200"
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
