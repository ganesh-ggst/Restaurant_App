import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
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
import { useAppTheme } from "../../hooks/useAppTheme";

export default function LoginScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const inputRef = useRef<any>(null);

  const validatePhone = (num: string) => {
    const regex = /^[6-9]\d{9}$/;
    return regex.test(num);
  };

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

    router.push(
      `/(auth)/verify-otp?phone=${fullPhoneNumber}&fallbackOtp=${fallbackOtp}` as any,
    );
    setLoading(false);
  };

  const handleSkip = () => {
    const guestPhone = "+910000000000";
    // Passing isGuest=true so the profile knows to show Guest
    router.replace(`/(home)?phone=${guestPhone}&isGuest=true` as any);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <Animated.View
          layout={Layout.springify()}
          className="flex-1 justify-between pb-3"
        >
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

          <Animated.View layout={Layout.springify()} className="px-6">
            <Text className="text-2xl font-bold" style={{ color: theme.text }}>
              Delicious food,{"\n"}
              <Text style={{ color: theme.primary }}>crafted for you.</Text>
            </Text>

            <View className="min-h-[20px] mb-1 justify-center">
              {error ? (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  exiting={FadeOut.duration(150)}
                >
                  <Text
                    className="text-xs font-medium ml-1"
                    style={{ color: theme.danger }}
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
                  <View
                    className="flex-row items-center border-r pr-3 mr-1"
                    style={{ borderRightColor: theme.border }}
                  >
                    <Text className="text-lg mr-2">🇮🇳</Text>
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: theme.text }}
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

            <Pressable
              onPress={handleSkip}
              className="mt-2 py-2 self-center px-4"
            >
              <Text
                className="text-lg font-semibold"
                style={{ color: theme.muted }}
              >
                Skip for now <Text style={{ color: theme.primary }}>→</Text>
              </Text>
            </Pressable>
          </Animated.View>

          <View className="px-6 items-center pt-1">
            <Text
              className="text-center text-[10px]"
              style={{ color: theme.muted }}
            >
              By continuing, you agree to our
            </Text>
            <Pressable onPress={() => console.log("Terms of Use clicked")}>
              <View className="flex-row items-center justify-center mt-0.5">
                <Text
                  className="text-[10px] font-bold"
                  style={{ color: theme.primary }}
                >
                  Terms of Use
                </Text>
                <Text className="text-[10px]" style={{ color: theme.muted }}>
                  {" "}
                  &{" "}
                </Text>
                <Text
                  className="text-[10px] font-bold"
                  style={{ color: theme.primary }}
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
