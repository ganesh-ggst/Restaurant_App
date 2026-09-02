import { useColorScheme } from "nativewind";
import { View } from "react-native";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "subtle";
}

export function Card({
  children,
  className = "",
  variant = "default",
}: CardProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const getBgColor = () => {
    switch (variant) {
      case "elevated":
        return isDark ? "hsl(149, 27%, 15%)" : "hsl(0, 0%, 100%)";
      case "subtle":
        return isDark ? "hsl(149, 18%, 16%)" : "hsl(141, 47%, 83%)";
      default:
        return isDark ? "hsl(149, 27%, 12%)" : "hsl(0, 0%, 100%)";
    }
  };

  const getBorderColor = () => {
    return isDark ? "hsl(149, 16%, 24%)" : "hsl(141, 47%, 83%)";
  };

  return (
    <View
      className={`rounded-2xl border p-6 ${className}`}
      style={{
        backgroundColor: getBgColor(),
        borderColor: getBorderColor(),
        borderWidth: 1,
      }}
    >
      {children}
    </View>
  );
}
