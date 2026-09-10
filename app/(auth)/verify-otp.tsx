import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";
import { MOCK_USER } from "../../constants/mockData";
import { useAppTheme } from "../../hooks/useAppTheme";

export default function VerifyOtpScreen() {
  const router = useRouter();
  const theme = useAppTheme();

  const { phone, fallbackOtp } = useLocalSearchParams<{
    phone: string;
    fallbackOtp?: string;
  }>();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [activeFallback, setActiveFallback] = useState<string | undefined>(
    fallbackOtp,
  );

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (code.length === 6) {
      handleVerifyCode(code);
    }
  }, [code]);

  const handleVerifyCode = (verificationCode: string) => {
    setLoading(true);
    setError("");

    if (activeFallback && verificationCode === activeFallback) {
      Keyboard.dismiss();
      setLoading(false);

      // Check if user exists in the MOCK_USER array with role === "user"
      const isExistingUser = MOCK_USER.some(
        (u: any) => u.phone_number === phone && u.role === "user",
      );

      if (isExistingUser) {
        router.replace(`/(home)?phone=${phone}` as any);
      } else {
        router.replace(`/(auth)/basic-details?phone=${phone}` as any);
      }
      return;
    }

    setError("Invalid code. Please try again.");
    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleResendCode = () => {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`\n==========================================`);
    console.log(`📲 DEV OTP FOR ${phone}: ${newOtp} (RESENT)`);
    console.log(`==========================================\n`);

    setActiveFallback(newOtp);
    setCode("");
    setError("");
    inputRef.current?.focus();
  };

  const goBackSafe = () => {
    Keyboard.dismiss();
    setTimeout(() => router.back(), 100);
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
          <View className="flex-none">
            <View className="flex-row items-center mb-8">
              <Pressable
                onPress={goBackSafe}
                className="p-2 -ml-2"
                hitSlop={20}
              >
                <Text className="text-2xl" style={{ color: theme.text }}>
                  ←
                </Text>
              </Pressable>
            </View>
            <View className="mb-8">
              <Text
                className="text-2xl font-bold mb-2"
                style={{ color: theme.text }}
              >
                Verify your number
              </Text>
              <Text className="text-sm" style={{ color: theme.muted }}>
                Enter the 6-digit code we sent to{"\n"}
                <Text className="font-bold" style={{ color: theme.text }}>
                  {phone}
                </Text>
              </Text>
            </View>
            <View className="min-h-[24px] mb-2 justify-center">
              {error ? (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(150)}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{ color: theme.danger }}
                  >
                    {error}
                  </Text>
                </Animated.View>
              ) : null}
            </View>
            <Pressable
              onPress={() => inputRef.current?.focus()}
              className="relative flex-row justify-between w-full mb-8"
            >
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const digit = code[index] || "";
                const isActive = code.length === index;
                return (
                  <View
                    key={index}
                    className="w-12 h-14 rounded-xl items-center justify-center border-2"
                    style={{
                      backgroundColor: theme.card,
                      borderColor: isActive ? theme.primary : theme.border,
                    }}
                  >
                    <Text
                      className="text-2xl font-bold"
                      style={{ color: theme.text }}
                    >
                      {digit}
                    </Text>
                  </View>
                );
              })}
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={(text) => {
                  const num = text.replace(/[^0-9]/g, "");
                  setCode(num);
                  setError("");
                }}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus={true}
                caretHidden={true}
                className="absolute w-full h-full opacity-0"
              />
            </Pressable>
            <Button
              title="Verify & Continue"
              onPress={() => handleVerifyCode(code)}
              loading={loading}
              disabled={code.length !== 6}
              className="py-3.5"
            />
            <View className="items-center mt-6">
              <Pressable onPress={handleResendCode} className="px-4 py-2">
                <Text
                  className="text-sm font-semibold"
                  style={{ color: theme.primary }}
                >
                  Didn't receive the code? Resend
                </Text>
              </Pressable>
            </View>
          </View>
          <View className="flex-1" />
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
