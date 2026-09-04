import { useSignIn, useSignUp } from "@clerk/expo";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useCallback, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut, Layout } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";

// Login Screen: Handles phone authentication flow
export default function LoginScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const { signIn, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const inputRef = useRef<any>(null);

  const bgColor = isDark ? "hsl(150, 31%, 9%)" : "hsl(138, 47%, 97%)";
  const textColor = isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)";

  const validatePhone = (num: string) => {
    const regex = /^[6-9]\d{9}$/;
    return regex.test(num);
  };

  // Re-focus the input automatically when returning to this screen
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }, []),
  );

  const handleSendOtp = async () => {
    if (!validatePhone(phone)) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    setError("");

    const fullPhoneNumber = `+91${phone}`;
    const fallbackOtp = Math.floor(100000 + Math.random() * 900000).toString();

    console.log(`\n==========================================`);
    console.log(`📲 DEV OTP FOR ${fullPhoneNumber}: ${fallbackOtp}`);
    console.log(`==========================================\n`);

    // --- CLERK CODE COMMENTED OUT FOR DEV TESTING ---
    /*
    try {
      if (!isSignInLoaded || !isSignUpLoaded) {
        throw new Error("Clerk is not loaded yet");
      }

      try {
        const { supportedFirstFactors } = await signIn.create({
          identifier: fullPhoneNumber,
        });

        const phoneFactor: any = supportedFirstFactors?.find(
          (factor: any) => factor.strategy === "phone_code",
        );

        if (phoneFactor) {
          await signIn.prepareFirstFactor({
            strategy: "phone_code",
            phoneNumberId: phoneFactor.phoneNumberId,
          });
        }
      } catch (signInErr: any) {
        if (signInErr.errors?.[0]?.code === "form_identifier_not_found") {
          await signUp.create({
            phoneNumber: fullPhoneNumber,
          });
          await signUp.preparePhoneNumberVerification({
            strategy: "phone_code",
          });
        } else {
          throw signInErr;
        }
      }

      router.push(`/(auth)/verify-otp?phone=${fullPhoneNumber}` as any);
    } catch (err: any) {
      console.error("Clerk Error:", err.errors ? err.errors[0].message : err);
      console.log("Using fallback terminal OTP due to Clerk failure.");

      router.push(
        `/(auth)/verify-otp?phone=${fullPhoneNumber}&fallbackOtp=${fallbackOtp}` as any,
      );
    } finally {
      setLoading(false);
    }
    */

    // Direct routing for fallback testing immediately to avoid keyboard jumping layout
    router.push(
      `/(auth)/verify-otp?phone=${fullPhoneNumber}&fallbackOtp=${fallbackOtp}` as any,
    );
    setLoading(false);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: bgColor }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <Animated.View
          layout={Layout.springify()}
          className="flex-1 justify-between pb-3"
        >
          {/* Hero Image Section without any overlapping buttons */}
          <View
            className="relative w-full h-[28%] px-6"
            style={{ marginTop: insets.top + 4 }}
          >
            <Image
              source={require("../../assets/images/auth/login-hero.jpg")}
              className="w-full h-full rounded-[28px]"
              resizeMode="cover"
            />
          </View>

          {/* Form Content Section */}
          <Animated.View layout={Layout.springify()} className="px-6">
            <Text className="text-2xl font-bold" style={{ color: textColor }}>
              Delicious food,{"\n"}
              <Text
                style={{
                  color: isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)",
                }}
              >
                crafted for you.
              </Text>
            </Text>

            {/* Reserved fixed-height space for error message to prevent layout shifts */}
            <View className="min-h-[20px] mb-1 justify-center">
              {error ? (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(150)}
                >
                  <Text
                    className="text-xs font-medium ml-1"
                    style={{
                      color: isDark ? "hsl(7, 85%, 76%)" : "hsl(6, 74%, 54%)",
                    }}
                  >
                    {error}
                  </Text>
                </Animated.View>
              ) : null}
            </View>

            <Card variant="default" className="p-3">
              <Input
                ref={inputRef}
                placeholder="Enter Phone Number"
                value={phone}
                onChangeText={(text) => {
                  const numericText = text.replace(/[^0-9]/g, "");
                  setPhone(numericText);
                  setError("");
                }}
                keyboardType={"number-pad" as any}
                maxLength={10}
                autoFocus={true}
                prefix={
                  <View className="flex-row items-center border-r border-slate-300 dark:border-slate-700 pr-3 mr-1">
                    <Text className="text-lg mr-2">🇮🇳</Text>
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: textColor }}
                    >
                      +91
                    </Text>
                  </View>
                }
              />

              <Button
                title="Continue"
                onPress={handleSendOtp}
                loading={loading}
                disabled={phone.length !== 10}
                className="py-2.5 mt-1"
              />
            </Card>

            {/* Skip Option cleanly placed right below the action card and constrained to its text width */}
            <Pressable
              onPress={() => router.replace("/(home)" as any)}
              className="mt-2 py-2 self-center px-4"
            >
              <Text
                className="text-lg font-semibold"
                style={{
                  color: isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)",
                }}
              >
                Skip for now{" "}
                <Text
                  style={{
                    color: isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)",
                  }}
                >
                  →
                </Text>
              </Text>
            </Pressable>
          </Animated.View>

          {/* Terms and Privacy Footer */}
          <View className="px-6 items-center pt-1">
            <Text
              className="text-center text-[10px]"
              style={{
                color: isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)",
              }}
            >
              By continuing, you agree to our
            </Text>
            <Pressable onPress={() => console.log("Terms of Use clicked")}>
              <View className="flex-row items-center justify-center mt-0.5">
                <Text
                  className="text-[10px] font-bold"
                  style={{
                    color: isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)",
                  }}
                >
                  Terms of Use
                </Text>
                <Text
                  className="text-[10px]"
                  style={{
                    color: isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)",
                  }}
                >
                  {" "}
                  &{" "}
                </Text>
                <Text
                  className="text-[10px] font-bold"
                  style={{
                    color: isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)",
                  }}
                >
                  Privacy Policy
                </Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
