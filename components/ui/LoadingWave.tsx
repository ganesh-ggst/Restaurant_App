import { LinearGradient } from "expo-linear-gradient";
import { useEffect, type ReactNode } from "react";
import {
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface LoadingWaveProps {
  className?: string;
  children?: ReactNode;
  isDark?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function LoadingWave({
  className,
  children,
  isDark = false,
  style,
}: LoadingWaveProps) {
  const { width } = useWindowDimensions();
  const travelDistance = Math.max(width, 240);
  const translateX = useSharedValue(-travelDistance);

  useEffect(() => {
    translateX.value = -travelDistance;
    translateX.value = withRepeat(
      withTiming(travelDistance, {
        duration: 1500,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => cancelAnimation(translateX);
  }, [translateX, travelDistance]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const colors = isDark
    ? ([
        "transparent",
        "rgba(255,255,255,0.04)",
        "rgba(255,255,255,0.16)",
        "rgba(255,255,255,0.04)",
        "transparent",
      ] as const)
    : ([
        "transparent",
        "rgba(20,83,45,0.03)",
        "rgba(20,83,45,0.10)",
        "rgba(20,83,45,0.03)",
        "transparent",
      ] as const);

  return (
    <View
      className={`overflow-hidden ${className || ""}`}
      style={[{ position: "relative" }, style]}
      pointerEvents="none"
    >
      {children}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: travelDistance * 0.45,
          },
          shimmerStyle,
        ]}
      >
        <LinearGradient
          colors={colors}
          locations={[0, 0.25, 0.5, 0.75, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
}
