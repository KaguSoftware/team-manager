import { forwardRef } from "react";
import { Pressable, type PressableProps, type View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { tap } from "@/lib/haptics";

const SPRING = { damping: 20, stiffness: 300 };

// Pressable with a springy press-scale and an optional haptic tick. The scale
// lives on an Animated.View wrapper while the className stays on a plain core
// Pressable — NativeWind reliably styles core Pressable, whereas className on a
// Reanimated-wrapped Pressable can silently drop (which previously made the
// FABs invisible). Press handlers are wired straight through so it still works
// as the child of an expo-router <Link asChild>.
export const AnimatedPressable = forwardRef<View, PressableProps & { haptic?: boolean }>(
  function AnimatedPressable({ haptic = true, onPress, onPressIn, onPressOut, ...props }, ref) {
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    return (
      <Animated.View style={animatedStyle}>
        <Pressable
          ref={ref}
          {...props}
          onPressIn={(e) => {
            scale.value = withSpring(0.97, SPRING);
            onPressIn?.(e);
          }}
          onPressOut={(e) => {
            scale.value = withSpring(1, SPRING);
            onPressOut?.(e);
          }}
          onPress={(e) => {
            if (haptic) tap();
            onPress?.(e);
          }}
        />
      </Animated.View>
    );
  },
);
