import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Card } from "./ui";

// Pulsing placeholder block. Size it with className (h-*, w-*).
export function Skeleton({ className }: { className?: string }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.45, { duration: 700 }), -1, true);
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={style}>
      <View className={`rounded-xl bg-ink-200 dark:bg-ink-800 ${className ?? ""}`} />
    </Animated.View>
  );
}

export function SkeletonCard() {
  return (
    <Card className="mb-2">
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="mt-2 h-3 w-2/5" />
    </Card>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}
