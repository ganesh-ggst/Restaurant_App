import { useColorScheme } from "nativewind";
import { Pressable, Text } from "react-native";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "destructive";
  disabled?: boolean;
  loading?: boolean;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
}: ButtonProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)",
          borderColor: "transparent",
        };
      case "secondary":
        return {
          backgroundColor: isDark ? "hsl(149, 24%, 19%)" : "hsl(143, 61%, 91%)",
          borderColor: isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)",
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          borderColor: isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)",
        };
      case "destructive":
        return {
          backgroundColor: isDark ? "hsl(8, 55%, 16%)" : "hsl(8, 100%, 97%)",
          borderColor: isDark ? "hsl(7, 85%, 76%)" : "hsl(6, 74%, 54%)",
        };
      default:
        return {};
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "primary":
        return isDark ? "hsl(150, 35%, 100%)" : "hsl(0, 0%, 100%)";
      case "secondary":
        return isDark ? "hsl(138, 30%, 83%)" : "hsl(146, 55%, 24%)";
      case "outline":
        return isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)";
      case "destructive":
        return isDark ? "hsl(7, 85%, 76%)" : "hsl(6, 71%, 48%)";
      default:
        return "hsl(0, 0%, 100%)";
    }
  };

  const styles = getVariantStyles();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`rounded-xl border-2 py-4 px-6 ${disabled || loading ? "opacity-50" : ""}`}
      style={[
        {
          backgroundColor: styles.backgroundColor,
          borderColor: styles.borderColor,
        },
      ]}
    >
      <Text
        className="text-center text-lg font-bold"
        style={{ color: getTextColor() }}
      >
        {loading ? "Loading..." : title}
      </Text>
    </Pressable>
  );
}
