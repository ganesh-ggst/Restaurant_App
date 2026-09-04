import { useSession, useSignIn, useSignUp } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";
import { getUserByPhone, initDB } from "../../lib/db";

export default function VerifyOtpScreen() {
  const router = useRouter();
  const { phone, fallbackOtp } = useLocalSearchParams<{
    phone: string;
    fallbackOtp?: string;
  }>();

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const { setActive } = useSession();
  const { signIn, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [activeFallback, setActiveFallback] = useState<string | undefined>(
    fallbackOtp,
  );

  const inputRef = useRef<TextInput>(null);

  const bgColor = isDark ? "hsl(150, 31%, 9%)" : "hsl(138, 47%, 97%)";
  const textColor = isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)";
  const boxBgColor = isDark ? "hsl(149, 16%, 24%)" : "hsl(141, 47%, 83%)";
  const activeBorderColor = isDark
    ? "hsl(142, 70%, 54%)"
    : "hsl(147, 75%, 33%)";

  useEffect(() => {
    // Initialize DB table on load just in case
    initDB();
  }, []);

  useEffect(() => {
    if (code.length === 6) {
      handleVerifyCode(code);
    }
  }, [code]);

  const handleVerifyCode = async (verificationCode: string) => {
    setLoading(true);
    setError("");

    if (activeFallback) {
      if (verificationCode === activeFallback) {
        Keyboard.dismiss();

        try {
          // ==========================================
          // DB ROUTING LOGIC: EXISTING VS NEW USER
          // ==========================================
          const existingUser = await getUserByPhone(phone);

          if (existingUser) {
            // User exists! Send straight to home and pass phone so home can query DB
            router.replace(`/(home)?phone=${phone}` as any);
          } else {
            // New user! Route to basic details to collect name
            router.replace(`/(auth)/basic-details?phone=${phone}` as any);
          }
          // ==========================================
        } catch (dbErr) {
          console.error("DB check failed:", dbErr);
          setError("Network error. Please try again.");
          setTimeout(() => inputRef.current?.focus(), 100);
        } finally {
          setLoading(false);
        }
        return;
      } else {
        setError("Invalid code. Please try again.");
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
        return;
      }
    }

    // --- CLERK CODE COMMENTED OUT FOR DEV TESTING ---
    /*
    try {
      if (!isSignInLoaded || !isSignUpLoaded) throw new Error("Clerk not loaded");

      if (signIn.status === "needs_first_factor") {
        const signInAttempt = await signIn.attemptFirstFactor({ strategy: "phone_code", code: verificationCode });
        if (signInAttempt.status === "complete") {
          Keyboard.dismiss();
          await setActive({ session: signInAttempt.createdSessionId });
          
          // Add DB Check here when using Clerk in production
          const existingUser = await getUserByPhone(phone);
          if (existingUser) {
            router.replace(`/(home)?phone=${phone}` as any);
          } else {
            router.replace(`/(auth)/basic-details?phone=${phone}` as any);
          }
        } else {
          setError("Invalid code.");
        }
      } else if (signUp.status === "missing_requirements" || signUp.status === "unverified") {
        const signUpAttempt = await signUp.attemptPhoneNumberVerification({ code: verificationCode });
        if (signUpAttempt.status === "complete") {
          Keyboard.dismiss();
          await setActive({ session: signUpAttempt.createdSessionId });
          router.replace(`/(auth)/basic-details?phone=${phone}` as any);
        } else {
          setError("Invalid code.");
        }
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Invalid OTP code.");
    } finally {
      setLoading(false);
    }
    */
    setLoading(false);
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
          <View className="flex-none">
            <View className="flex-row items-center mb-8">
              <Pressable
                onPress={goBackSafe}
                className="p-2 -ml-2"
                hitSlop={20}
              >
                <Text className="text-2xl" style={{ color: textColor }}>
                  ←
                </Text>
              </Pressable>
            </View>
            <View className="mb-8">
              <Text
                className="text-2xl font-bold mb-2"
                style={{ color: textColor }}
              >
                Verify your number
              </Text>
              <Text
                className="text-sm"
                style={{
                  color: isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)",
                }}
              >
                Enter the 6-digit code we sent to{"\n"}
                <Text className="font-bold" style={{ color: textColor }}>
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
                    style={{
                      color: isDark ? "hsl(7, 85%, 76%)" : "hsl(6, 74%, 54%)",
                    }}
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
                      backgroundColor: boxBgColor,
                      borderColor: isActive ? activeBorderColor : "transparent",
                    }}
                  >
                    <Text
                      className="text-2xl font-bold"
                      style={{ color: textColor }}
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
                  style={{
                    color: isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)",
                  }}
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
