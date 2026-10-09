import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Keyboard,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import { Button } from "../../components/ui/Button";
import { useAppTheme } from "../../hooks/useAppTheme";
import { api } from "../../services/api";
import { managerProfileApi } from "../../services/api/manager-profile";
import {
  getAuthDestination,
  isKnownManagerType,
} from "../../services/authRouting";

export default function VerifyOtpScreen() {
  const router = useRouter();
  const theme = useAppTheme();

  const { phone } = useLocalSearchParams<{ phone: string }>();
  const normalizedPhone = phone?.replace(/\s/g, "+") || "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [error, setError] = useState<string>("");

  const inputRef = useRef<TextInput>(null);
  const verificationInProgress = useRef(false);

  const handleVerifyCode = useCallback(
    async (verificationCode: string) => {
      if (verificationInProgress.current || verificationCode.length !== 6) {
        return;
      }

      verificationInProgress.current = true;
      setLoading(true);
      setError("");
      Keyboard.dismiss();

      try {
        const { user } = await api.verifyOtp(normalizedPhone, verificationCode);

        if (!user.isProfileCompleted) {
          router.replace(
            `/(auth)/basic-details?phone=${encodeURIComponent(normalizedPhone)}` as any,
          );
        } else {
          const managerType =
            user.role.toLowerCase() === "manager"
              ? (isKnownManagerType(user.managerType)
                  ? user.managerType
                  : null) ||
                (await managerProfileApi.getProfile()).manager.managerType
              : user.managerType;
          router.replace(
            `${getAuthDestination(user.role, managerType)}?phone=${encodeURIComponent(normalizedPhone)}` as any,
          );
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Invalid code. Please try again.",
        );
        setTimeout(() => inputRef.current?.focus(), 100);
      } finally {
        verificationInProgress.current = false;
        setLoading(false);
      }
    },
    [normalizedPhone, router],
  );

  useEffect(() => {
    if (resendSeconds === 0) {
      return;
    }

    const timer = setTimeout(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  const handleResendCode = async () => {
    if (resending || loading || resendSeconds > 0) {
      return;
    }

    setResending(true);
    setError("");
    try {
      const result = await api.resendOtp(normalizedPhone);
      setCode("");
      setResendSeconds(result.resendAvailableInSeconds);
      inputRef.current?.focus();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to resend OTP. Please try again.",
      );
    } finally {
      setResending(false);
    }
  };

  const goBackSafe = useCallback(() => {
    if (verificationInProgress.current) {
      return;
    }

    Keyboard.dismiss();
    router.back();
  }, [router]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        void goBackSafe();
        return true;
      },
    );

    return () => subscription.remove();
  }, [goBackSafe]);

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
                  {normalizedPhone}
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
                  if (num.length === 6) {
                    handleVerifyCode(num);
                  }
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
              <Pressable
                onPress={handleResendCode}
                disabled={resending || loading || resendSeconds > 0}
                className="px-4 py-2"
              >
                <Text
                  className="text-sm font-semibold"
                  style={{
                    color:
                      resending || loading || resendSeconds > 0
                        ? theme.muted
                        : theme.primary,
                  }}
                >
                  {resending
                    ? "Sending..."
                    : resendSeconds > 0
                      ? `Resend in ${resendSeconds}s`
                      : "Didn't receive the code? Resend"}
                </Text>
              </Pressable>
            </View>
          </View>
          <View className="flex-1" />
        </Animated.View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
