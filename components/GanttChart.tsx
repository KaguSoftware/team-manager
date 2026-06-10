import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Line, Path, Rect, Text as SvgText } from "react-native-svg";
import type { Task } from "@/lib/database.types";

const STATUS_COLORS: Record<Task["status"], string> = {
  todo: "#9ca3af",
  in_progress: "#3b66f6",
  review: "#d97706",
  done: "#16a34a",
};

const ROW_H = 40;
const BAR_H = 22;
const HEADER_H = 36;
const LABEL_W = 120;

const DAY_MS = 86_400_000;

function parseDate(d: string) {
  // dates are date-only strings; anchor at local midnight
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

export type GanttZoom = "day" | "week" | "month";
const ZOOM_DAY_W: Record<GanttZoom, number> = { day: 48, week: 18, month: 6 };

export function GanttChart({
  tasks,
  zoom,
  onTaskPress,
}: {
  tasks: Task[];
  zoom: GanttZoom;
  onTaskPress?: (task: Task) => void;
}) {
  const dayW = ZOOM_DAY_W[zoom];

  const model = useMemo(() => {
    const scheduled = tasks.filter((t) => t.start_date || t.due_date);
    if (scheduled.length === 0) return null;

    const rows = scheduled.map((t) => {
      const start = parseDate(t.start_date ?? t.due_date!);
      const end = parseDate(t.due_date ?? t.start_date!);
      return { task: t, start, end: end < start ? start : end };
    });

    let min = rows[0].start;
    let max = rows[0].end;
    for (const r of rows) {
      if (r.start < min) min = r.start;
      if (r.end > max) max = r.end;
    }
    // pad the window by 2 days each side
    min = new Date(min.getTime() - 2 * DAY_MS);
    max = new Date(max.getTime() + 3 * DAY_MS);

    const days = Math.max(1, Math.round((max.getTime() - min.getTime()) / DAY_MS));
    const indexById = new Map(rows.map((r, i) => [r.task.id, i]));
    return { rows, min, days, indexById };
  }, [tasks]);

  if (!model) {
    return (
      <View className="items-center justify-center py-16">
        <Text className="text-gray-500 dark:text-gray-400">
          Give tasks start/due dates to see them on the timeline
        </Text>
      </View>
    );
  }

  const { rows, min, days, indexById } = model;
  const chartW = days * dayW;
  const chartH = rows.length * ROW_H;

  const xOf = (d: Date) => ((d.getTime() - min.getTime()) / DAY_MS) * dayW;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayX = xOf(today);

  // header ticks: every day (day zoom), week start (week), month start (month)
  const ticks: { x: number; label: string }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(min.getTime() + i * DAY_MS);
    const show =
      zoom === "day" ||
      (zoom === "week" && d.getDay() === 1) ||
      (zoom === "month" && d.getDate() === 1);
    if (show) {
      ticks.push({
        x: i * dayW,
        label:
          zoom === "month"
            ? d.toLocaleDateString([], { month: "short" })
            : d.toLocaleDateString([], { day: "numeric", month: "short" }),
      });
    }
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View className="flex-row">
        {/* fixed label column */}
        <View style={{ width: LABEL_W, paddingTop: HEADER_H }}>
          {rows.map(({ task }) => (
            <Pressable
              key={task.id}
              onPress={() => onTaskPress?.(task)}
              style={{ height: ROW_H }}
              className="justify-center pr-2"
            >
              <Text numberOfLines={2} className="text-xs text-gray-700 dark:text-gray-300">
                {task.title}
              </Text>
            </Pressable>
          ))}
        </View>

        <Svg width={chartW} height={HEADER_H + chartH}>
          {/* grid + header */}
          {ticks.map((t, i) => (
            <Line
              key={`g${i}`}
              x1={t.x}
              y1={HEADER_H}
              x2={t.x}
              y2={HEADER_H + chartH}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          ))}
          {ticks.map((t, i) => (
            <SvgText key={`t${i}`} x={t.x + 3} y={HEADER_H - 10} fontSize={10} fill="#6b7280">
              {t.label}
            </SvgText>
          ))}

          {/* today marker */}
          {todayX >= 0 && todayX <= chartW ? (
            <Line
              x1={todayX}
              y1={HEADER_H}
              x2={todayX}
              y2={HEADER_H + chartH}
              stroke="#dc2626"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          ) : null}

          {/* dependency connectors */}
          {rows.map(({ task }, i) => {
            if (!task.depends_on) return null;
            const fromIdx = indexById.get(task.depends_on);
            if (fromIdx === undefined) return null;
            const from = rows[fromIdx];
            const x1 = xOf(from.end) + dayW; // end of predecessor bar
            const y1 = HEADER_H + fromIdx * ROW_H + ROW_H / 2;
            const x2 = xOf(rows[i].start);
            const y2 = HEADER_H + i * ROW_H + ROW_H / 2;
            const midX = Math.max(x1 + 8, x2 - 8);
            return (
              <Path
                key={`d${task.id}`}
                d={`M ${x1} ${y1} L ${x1 + 8} ${y1} L ${midX} ${y2} L ${x2} ${y2}`}
                stroke="#9ca3af"
                strokeWidth={1.5}
                fill="none"
              />
            );
          })}

          {/* task bars */}
          {rows.map(({ task, start, end }, i) => {
            const x = xOf(start);
            const w = Math.max(dayW * 0.8, xOf(end) - x + dayW);
            const y = HEADER_H + i * ROW_H + (ROW_H - BAR_H) / 2;
            return (
              <Rect
                key={task.id}
                x={x}
                y={y}
                width={w}
                height={BAR_H}
                rx={6}
                fill={STATUS_COLORS[task.status]}
                opacity={task.status === "done" ? 0.55 : 0.9}
                onPress={() => onTaskPress?.(task)}
              />
            );
          })}
        </Svg>
      </View>
    </ScrollView>
  );
}
