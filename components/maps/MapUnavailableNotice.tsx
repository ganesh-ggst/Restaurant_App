import { MapPin } from "lucide-react-native";
import { Text, View } from "react-native";

import { useAppTheme } from "../../hooks/useAppTheme";

export function MapUnavailableNotice() {
  const theme = useAppTheme();

  return (
    <View className="flex-1 items-center justify-center px-8">
      <MapPin size={36} color={theme.muted} />
      <Text
        className="mt-4 text-center text-base font-bold"
        style={{ color: theme.text }}
      >
        Map selection is unavailable in this build.
      </Text>
      <Text className="mt-2 text-center text-sm" style={{ color: theme.muted }}>
        Use your current location or contact support.
      </Text>
    </View>
  );
}
