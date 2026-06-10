import { Text, useColorScheme, View } from "react-native";
import { accent } from "@/lib/theme";

export function ProgressRow({
  label,
  done,
  total,
  color,
}: {
  label: string;
  done: number;
  total: number;
  color?: string;
}) {
  const scheme = useColorScheme();
  const fill = color ?? accent(scheme);
  const pct = total ? (done / total) * 100 : 0;

  return (
    <View className="mb-3">
      <View className="mb-1 flex-row items-center justify-between">
        <Text
          className="flex-1 pr-2 text-sm text-gray-700 dark:text-gray-300"
          numberOfLines={1}
        >
          {label}
        </Text>
        <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {done}/{total}
        </Text>
      </View>
      <View className="h-2 rounded-full bg-ink-100 dark:bg-ink-800">
        <View
          style={{ width: `${pct}%`, backgroundColor: fill }}
          className="h-2 rounded-full"
        />
      </View>
    </View>
  );
}
