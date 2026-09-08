import { ActivityIndicator, Pressable, Text } from "react-native";
import { useAppTheme } from "../../hooks/useAppTheme";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "destructive";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  className = "",
}: ButtonProps) {
  const theme = useAppTheme();

  const variantStyles = {
    primary: {
      bg: theme.primary,
      border: "transparent",
      text: theme.primaryForeground,
    },
    secondary: {
      bg: theme.secondaryBg,
      border: theme.primary,
      text: theme.secondaryText,
    },
    outline: {
      bg: "transparent",
      border: theme.primary,
      text: theme.primary,
    },
    destructive: {
      bg: theme.dangerBg,
      border: theme.danger,
      text: theme.dangerText,
    },
  };

  const currentStyle = variantStyles[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`flex-row items-center justify-center rounded-xl border-2 px-6 py-4 ${
        disabled || loading ? "opacity-50" : "active:opacity-80"
      } ${className}`}
      style={{
        backgroundColor: currentStyle.bg,
        borderColor: currentStyle.border,
      }}
    >
      {loading ? (
        <ActivityIndicator color={currentStyle.text} />
      ) : (
        <Text
          className="text-center text-lg font-bold"
          style={{ color: currentStyle.text }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
