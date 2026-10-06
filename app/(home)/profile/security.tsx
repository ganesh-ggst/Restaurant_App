import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ChevronRight, Smartphone } from "lucide-react-native";
import { Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProfileScreenHeader } from "../../../components/profile/ProfileUi";
import { useAppTheme } from "../../../hooks/useAppTheme";

export default function SecurityScreen() {
  const router = useRouter();
  const theme = useAppTheme();

  const showComingSoon = () => {
    Alert.alert(
      "Coming Soon",
      "Change Mobile Number is currently under development.",
    );
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <ProfileScreenHeader
        title="Security Settings"
        onBack={() => router.back()}
      />
      <View className="px-5 pt-10">
        <Pressable
          onPress={showComingSoon}
          className="flex-row items-center rounded-[28px] border px-5 py-6"
          style={{ backgroundColor: theme.card, borderColor: theme.border }}
        >
          <Smartphone size={24} color={theme.primary} strokeWidth={2} />
          <Text
            className="ml-5 flex-1 text-base font-bold"
            style={{ color: theme.text }}
          >
            Change Mobile Number
          </Text>
          <ChevronRight size={22} color={theme.primary} strokeWidth={2} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
