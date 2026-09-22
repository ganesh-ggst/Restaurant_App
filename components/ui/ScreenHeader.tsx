import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useAppTheme } from "../../hooks/useAppTheme";

interface ScreenHeaderProps {
  title: string;
  showBorder?: boolean;
}

export function ScreenHeader({ title, showBorder = true }: ScreenHeaderProps) {
  const theme = useAppTheme();
  const router = useRouter();

  return (
    <View
      className={`flex-row items-center px-6 pt-4 pb-4 ${showBorder ? "border-b" : ""}`}
      style={{ borderBottomColor: showBorder ? theme.border : "transparent" }}
    >
      <Pressable
        onPress={() => router.back()}
        className="p-2 -ml-2 mr-2"
        hitSlop={20}
      >
        <Text className="text-2xl" style={{ color: theme.text }}>
          ←
        </Text>
      </Pressable>
      <Text className="text-2xl font-bold" style={{ color: theme.text }}>
        {title}
      </Text>
    </View>
  );
}
