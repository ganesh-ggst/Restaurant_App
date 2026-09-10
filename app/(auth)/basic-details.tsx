import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import Animated, { Layout } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useAppTheme } from "../../hooks/useAppTheme";

export default function BasicDetailsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSaveDetails = () => {
    Keyboard.dismiss();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      router.replace(
        `/(home)?phone=${phone}&name=${encodeURIComponent(firstName.trim())}&lastName=${encodeURIComponent(lastName.trim())}` as any,
      );
    }, 300);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <Animated.View
          layout={Layout.springify()}
          className="flex-1 px-6 pt-4 pb-6"
        >
          <View className="flex-row items-center mb-8">
            <Pressable
              onPress={() => router.back()}
              className="p-2 -ml-2"
              hitSlop={20}
            >
              <Text className="text-2xl" style={{ color: theme.text }}>
                ←
              </Text>
            </Pressable>
          </View>

          <View className="mb-6">
            <Text
              className="text-2xl font-bold mb-2"
              style={{ color: theme.text }}
            >
              Complete your profile
            </Text>
            <Text className="text-sm" style={{ color: theme.muted }}>
              Just a few details to get you started with {"\n"}
              <Text className="font-bold" style={{ color: theme.text }}>
                {phone}
              </Text>
            </Text>
          </View>

          <Card variant="default" className="p-3">
            <View className="mb-4">
              <Input
                placeholder="First Name"
                value={firstName}
                onChangeText={setFirstName}
                autoFocus={true}
                autoCapitalize="words"
              />
            </View>

            <View className="mb-6">
              <Input
                placeholder="Last Name"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </View>

            <Button
              title="Save & Continue"
              onPress={handleSaveDetails}
              loading={loading}
              disabled={!firstName.trim() || !lastName.trim()}
              className="py-2.5"
            />
          </Card>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
