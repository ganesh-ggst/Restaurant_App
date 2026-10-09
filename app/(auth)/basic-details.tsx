import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Alert,
  Keyboard,
  Pressable,
  Text,
  View,
} from "react-native";
import Animated, { Layout } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useAppTheme } from "../../hooks/useAppTheme";
import { api } from "../../services/api";
import { managerProfileApi } from "../../services/api/manager-profile";
import {
  getAuthDestination,
  isKnownManagerType,
} from "../../services/authRouting";

export default function BasicDetailsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSaveDetails = async () => {
    Keyboard.dismiss();
    setError("");
    setLoading(true);

    try {
      const result = await api.completeProfile(
        firstName.trim(),
        lastName.trim(),
      );
      const managerType =
        result.user.role.toLowerCase() === "manager"
          ? (isKnownManagerType(result.user.managerType)
              ? result.user.managerType
              : null) ||
            (await managerProfileApi.getProfile()).manager.managerType
          : result.user.managerType;

      router.replace(
        `${getAuthDestination(result.user.role, managerType)}?phone=${encodeURIComponent(phone)}` as any,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save your profile. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAbandonSignup = () => {
    Alert.alert("Cancel signup?", "Your incomplete signup will be deleted.", [
      { text: "Keep signing up", style: "cancel" },
      {
        text: "Cancel signup",
        style: "destructive",
        onPress: async () => {
          setError("");
          setLoading(true);
          try {
            await api.abandonSignup();
            router.replace("/(auth)/login" as any);
          } catch (abandonError) {
            setError(
              abandonError instanceof Error
                ? abandonError.message
                : "Failed to cancel signup. Please try again.",
            );
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid
        extraScrollHeight={24}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          layout={Layout.springify()}
          className="flex-grow px-6 pt-4 pb-6"
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
            {error ? (
              <Text
                className="mb-3 text-sm font-medium"
                style={{ color: theme.danger }}
              >
                {error}
              </Text>
            ) : null}
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
          <Pressable
            onPress={handleAbandonSignup}
            disabled={loading}
            className="mt-5 self-center px-4 py-2"
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: theme.danger }}
            >
              Cancel signup
            </Text>
          </Pressable>
        </Animated.View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
