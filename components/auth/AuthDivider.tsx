import { useColorScheme } from "nativewind";
import { Text, View } from "react-native";

interface AuthDividerProps {
  text?: string;
}

export function AuthDivider({ text = "OR" }: AuthDividerProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const lineColor = isDark ? "hsl(149, 16%, 24%)" : "hsl(141, 47%, 83%)";
  const textColor = isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)";

  return (
    <View className="my-6 flex-row items-center">
      <View
        className="flex-1"
        style={{ height: 1, backgroundColor: lineColor }}
      />
      <Text className="mx-4 text-sm font-medium" style={{ color: textColor }}>
        {text}
      </Text>
      <View
        className="flex-1"
        style={{ height: 1, backgroundColor: lineColor }}
      />
    </View>
  );
}
