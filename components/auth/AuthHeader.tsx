import { useColorScheme } from "nativewind";
import { Image, Text, View } from "react-native";

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
  imageSource?: any;
}

export function AuthHeader({ title, subtitle, imageSource }: AuthHeaderProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const textColor = isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)";
  const subtitleColor = isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)";

  return (
    <View className="mb-8 items-center">
      {imageSource && (
        <Image
          source={imageSource}
          className="mb-4 h-48 w-full rounded-3xl"
          resizeMode="cover"
        />
      )}
      <Text className="text-4xl font-bold" style={{ color: textColor }}>
        {title}
      </Text>
      {subtitle && (
        <Text
          className="mt-2 text-center text-base"
          style={{ color: subtitleColor }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}
