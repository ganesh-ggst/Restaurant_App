import { Text } from "react-native";
import { useAppTheme } from "../../hooks/useAppTheme";

interface SectionTitleProps {
  text: string;
  className?: string;
}

export function SectionTitle({ text, className = "mb-2" }: SectionTitleProps) {
  const theme = useAppTheme();

  return (
    <Text
      className={`text-sm font-bold ${className}`}
      style={{ color: theme.muted }}
    >
      {text}
    </Text>
  );
}
