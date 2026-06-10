import { useState } from "react";
import { useColorScheme, View, type LayoutChangeEvent } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import { accent, ICON_MUTED } from "@/lib/theme";

export function BarChart({
  data,
  height = 140,
  color,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
}) {
  const scheme = useColorScheme();
  const fill = color ?? accent(scheme);
  const [width, setWidth] = useState(300);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setWidth(w);
  };

  const labelH = 16;
  const chartH = height - labelH;
  const max = Math.max(1, ...data.map((d) => d.value));
  const n = Math.max(1, data.length);
  const slot = width / n;
  const barW = slot * 0.6;
  const gap = (slot - barW) / 2;

  return (
    <View onLayout={onLayout} style={{ width: "100%" }}>
      <Svg width={width} height={height}>
        {data.map((d, i) => {
          const h = (d.value / max) * chartH;
          const x = i * slot + gap;
          const y = chartH - h;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 0)}
              rx={3}
              fill={fill}
              opacity={d.value === 0 ? 0.25 : 0.9}
            />
          );
        })}
        {data.map((d, i) =>
          i % 2 === 0 ? (
            <SvgText
              key={`l${i}`}
              x={i * slot + slot / 2}
              y={height - 4}
              fontSize={9}
              fill={ICON_MUTED}
              textAnchor="middle"
            >
              {d.label}
            </SvgText>
          ) : null,
        )}
      </Svg>
    </View>
  );
}
