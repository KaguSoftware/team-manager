import { Text, useColorScheme, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { ink } from "@/lib/theme";
import { Subtle } from "@/components/ui";

type Segment = { label: string; value: number; color: string };

export function DonutChart({
  data,
  size = 160,
  strokeWidth = 22,
  centerValue,
  centerLabel,
}: {
  data: Segment[];
  size?: number;
  strokeWidth?: number;
  centerValue?: string;
  centerLabel?: string;
}) {
  const scheme = useColorScheme();
  const trackColor = scheme === "dark" ? ink[800] : ink[200];

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  const total = data.reduce((sum, d) => sum + d.value, 0);

  // Build positioned segments. Each segment is a dashed circle whose dash is the
  // segment arc and whose offset rotates it past the preceding segments.
  let acc = 0;
  const segments = total
    ? data
        .filter((d) => d.value > 0)
        .map((d) => {
          const len = (d.value / total) * circumference;
          const offset = -acc;
          acc += len;
          return { ...d, len, offset };
        })
    : [];

  return (
    <View className="items-center">
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {segments.map((s, i) => (
            <Circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              stroke={s.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="butt"
              strokeDasharray={[s.len, circumference - s.len]}
              strokeDashoffset={s.offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          ))}
        </Svg>
        {centerValue !== undefined || centerLabel !== undefined ? (
          <View
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            className="items-center justify-center"
          >
            {centerValue !== undefined ? (
              <Text className="text-3xl font-bold text-gray-900 dark:text-gray-50">
                {centerValue}
              </Text>
            ) : null}
            {centerLabel !== undefined ? <Subtle>{centerLabel}</Subtle> : null}
          </View>
        ) : null}
      </View>

      {data.length > 0 ? (
        <View className="mt-4 w-full gap-2">
          {data.map((d, i) => (
            <View key={i} className="flex-row items-center gap-2">
              <View
                style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: d.color }}
              />
              <Text className="flex-1 text-sm text-gray-700 dark:text-gray-300" numberOfLines={1}>
                {d.label}
              </Text>
              <Text className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {d.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
