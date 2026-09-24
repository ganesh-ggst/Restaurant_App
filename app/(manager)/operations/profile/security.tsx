import { useRouter } from "expo-router";
import { ArrowLeft, Smartphone } from "lucide-react-native";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "../../../../components/ui/Card";
import { useAppTheme } from "../../../../hooks/useAppTheme";

export default function SecurityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}
    >
      <View
        className="flex-row items-center px-4 py-4 border-b shadow-sm"
        style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}
      >
        <Pressable
          onPress={() => router.back()}
          className="mr-4 p-1"
          hitSlop={15}
        >
          <ArrowLeft size={24} color={theme.text} />
        </Pressable>
        <Text className="text-xl font-black" style={{ color: theme.text }}>
          Security Settings
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Card variant="default" className="p-4 rounded-3xl border-0 mb-6">
          <Pressable
            onPress={() =>
              Alert.alert(
                "Coming Soon",
                "Change Mobile Number is under development.",
              )
            }
            className="flex-row items-center justify-between py-2"
          >
            <View className="flex-row items-center gap-4">
              <Smartphone size={22} color={theme.primary} strokeWidth={2} />
              <Text
                className="text-base font-semibold"
                style={{ color: theme.text }}
              >
                Change Mobile Number
              </Text>
            </View>
          </Pressable>
        </Card>
      </ScrollView>
    </View>
  );
}
