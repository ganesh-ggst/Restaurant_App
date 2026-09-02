import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { Pressable, Text, View } from "react-native";

interface SocialButtonProps {
  icon: string;
  provider: string;
  onPress: () => void;
  disabled?: boolean;
}

export function SocialButton({
  icon,
  provider,
  onPress,
  disabled = false,
}: SocialButtonProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const bgColor = isDark ? "hsl(149, 27%, 12%)" : "hsl(0, 0%, 100%)";
  const borderColor = isDark ? "hsl(149, 16%, 24%)" : "hsl(141, 47%, 83%)";
  const textColor = isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)";
  const iconColor = isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-1 rounded-xl border-2 py-4 px-3 ${disabled ? "opacity-50" : ""}`}
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
      }}
    >
      <View className="items-center">
        <MaterialCommunityIcons
          name={icon as any}
          size={24}
          color={iconColor}
        />
        <Text
          className="mt-2 text-xs font-semibold"
          style={{ color: textColor }}
        >
          {provider}
        </Text>
      </View>
    </Pressable>
  );
}
