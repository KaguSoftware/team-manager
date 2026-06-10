import { cssInterop } from "nativewind";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { tap } from "@/lib/haptics";

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);
cssInterop(ReanimatedPressable, { className: "style" });

const SPRING = { damping: 20, stiffness: 300 };

// Pressable with a springy press-scale and an optional haptic tick. Accepts
// className like a regular Pressable, so it can be a drop-in swap.
export function AnimatedPressable({
  haptic = true,
  onPress,
  onPressIn,
  onPressOut,
  style,
  children,
  ...props
}: PressableProps & { haptic?: boolean; style?: StyleProp<ViewStyle> }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <ReanimatedPressable
      {...props}
      style={[animatedStyle, style]}
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
    >
      {children}
    </ReanimatedPressable>
  );
}
