import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
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
import { createUser } from "../../lib/db";

export default function BasicDetailsScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);

  const bgColor = isDark ? "hsl(150, 31%, 9%)" : "hsl(138, 47%, 97%)";
  const textColor = isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)";

  const handleSaveDetails = async () => {
    Keyboard.dismiss();
    setLoading(true);

    try {
      // Save directly to Neon DB
      await createUser(phone, firstName.trim(), lastName.trim());

      // Navigate to Home, pass the phone number so it can fetch the state
      router.replace(`/(home)?phone=${phone}` as any);
    } catch (err) {
      console.error("Failed to create user in DB:", err);
      // In a real app, you'd show an error toast here
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: bgColor }}>
      <StatusBar style={isDark ? "light" : "dark"} />

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
              <Text className="text-2xl" style={{ color: textColor }}>
                ←
              </Text>
            </Pressable>
          </View>

          <View className="mb-6">
            <Text
              className="text-2xl font-bold mb-2"
              style={{ color: textColor }}
            >
              Complete your profile
            </Text>
            <Text
              className="text-sm"
              style={{
                color: isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)",
              }}
            >
              Just a few details to get you started with {"\n"}
              <Text className="font-bold" style={{ color: textColor }}>
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
