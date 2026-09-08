import { View } from "react-native";
import { useAppTheme } from "../../hooks/useAppTheme";

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
  const theme = useAppTheme();

  const bgColors = {
    default: theme.card,
    elevated: theme.isDark ? "hsl(149, 27%, 15%)" : "hsl(0, 0%, 100%)",
    subtle: theme.isDark ? "hsl(149, 18%, 16%)" : "hsl(141, 47%, 83%)",
  };

  return (
    <View
      className={`rounded-2xl border p-6 ${className}`}
      style={{
        backgroundColor: bgColors[variant],
        borderColor: theme.border,
        borderWidth: 1,
      }}
    >
      {children}
    </View>
  );
}
