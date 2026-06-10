import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { Card, Subtle } from "@/components/ui";
import { DANGER, ICON_MUTED } from "@/lib/theme";

export function StatCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: "default" | "danger";
}) {
  return (
    <Card>
      <View className="mb-1 flex-row items-start justify-between">
        <Text
          className="text-3xl font-bold text-gray-900 dark:text-gray-50"
          style={tone === "danger" ? { color: DANGER } : undefined}
        >
          {value}
        </Text>
        <Ionicons name={icon} size={20} color={tone === "danger" ? DANGER : ICON_MUTED} />
      </View>
      <Subtle>{label}</Subtle>
    </Card>
  );
}
