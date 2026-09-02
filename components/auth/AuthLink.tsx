import { useColorScheme } from "nativewind";
import { Pressable, Text, View } from "react-native";

interface AuthLinkProps {
  text: string;
  linkText: string;
  onPress: () => void;
}

export function AuthLink({ text, linkText, onPress }: AuthLinkProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const textColor = isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)";
  const linkColor = isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)";

  return (
    <View className="mt-6 flex-row items-center justify-center">
      <Text className="text-center text-base" style={{ color: textColor }}>
        {text}{" "}
      </Text>
      <Pressable onPress={onPress}>
        <Text className="text-base font-bold" style={{ color: linkColor }}>
          {linkText}
        </Text>
      </Pressable>
    </View>
  );
}
