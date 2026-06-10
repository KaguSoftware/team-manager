import { Text, useColorScheme, View } from "react-native";
import { Avatar } from "@/components/ui";
import { accent } from "@/lib/theme";

export function WorkloadRow({
  name,
  open,
  max,
}: {
  name: string;
  open: number;
  max: number;
}) {
  const scheme = useColorScheme();
  const fill = accent(scheme);
  const pct = max ? (open / max) * 100 : 0;

  return (
    <View className="mb-3 flex-row items-center gap-3">
      <Avatar name={name} size={28} />
      <Text
        className="flex-1 text-sm text-gray-700 dark:text-gray-300"
        numberOfLines={1}
      >
        {name}
      </Text>
      <View className="h-2 w-24 rounded-full bg-ink-100 dark:bg-ink-800">
        <View
          style={{ width: `${pct}%`, backgroundColor: fill }}
          className="h-2 rounded-full"
        />
      </View>
      <Text className="w-6 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
        {open}
      </Text>
    </View>
  );
}
