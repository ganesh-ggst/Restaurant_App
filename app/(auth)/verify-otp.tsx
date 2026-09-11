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
import { useAppTheme } from "../../hooks/useAppTheme";
import { api } from "../../services/api";

export default function VerifyOtpScreen() {
  const router = useRouter();
  const theme = useAppTheme();

  // Only receiving the phone number from the previous screen
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (code.length === 6) {
      handleVerifyCode(code);
    }
  }, [code]);

  const handleVerifyCode = async (verificationCode: string) => {
    setLoading(true);
    setError("");
    Keyboard.dismiss();

    try {
      // 2. Validate OTP & Get JWT + Role entirely from Backend
      const response: any = await api.verifyOtp(phone, verificationCode);

      // ✅ Authentication Success
      const { token, user } = response;

      // TODO: Save JWT token to SecureStore/AsyncStorage here
      console.log("[AUTH] Received JWT:", token);

      // 3. Routing Logic based on Status and Role
      if (user.isNewUser) {
        // Force new users to complete their profile
        router.replace(`/(auth)/basic-details?phone=${phone}` as any);
      } else {
        // Existing User: Route based on Role
        switch (user.role) {
          case "admin":
            console.log("Routing to Admin Dash (Coming Soon)");
            break;
          case "manager":
            console.log("Routing to Manager Dash (Coming Soon)");
            break;
          case "waiter":
            console.log("Routing to Waiter Dash (Coming Soon)");
            break;
          case "user":
          default:
            router.replace(`/(home)?phone=${phone}` as any);
            break;
        }
      }
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
      setTimeout(() => inputRef.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setCode("");
    setError("");

    // Call backend to resend. The frontend handles no generation.
    await api.sendOtp(phone);
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
