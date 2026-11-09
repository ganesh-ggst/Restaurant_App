import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { type ComponentRef, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEvent } from "expo";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { useAppTheme } from "../../hooks/useAppTheme";
import { api } from "../../services/api";
import {
  authScreenMediaApi,
  type ActiveAuthScreenMedia,
} from "../../services/api/auth-screen-media";

function LoginScreenVideo({
  uri,
  onError,
}: {
  uri: string;
  onError: (message: string) => void;
}) {
  const player = useVideoPlayer({ uri }, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });
  const { status, error } = useEvent(player, "statusChange", {
    status: player.status,
  });

  useEffect(() => {
    if (status === "error") {
      onError(error?.message ?? "Unable to load login screen media.");
    }
  }, [error?.message, onError, status]);

  return (
    <VideoView
      player={player}
      contentFit="cover"
      nativeControls={false}
      style={StyleSheet.absoluteFill}
    />
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { branchId } = useLocalSearchParams<{ branchId?: string }>();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [loginMediaResult, setLoginMediaResult] = useState<{
    branchId?: string;
    media: ActiveAuthScreenMedia | null;
    error?: string;
  } | null>(null);
  const [loginMediaLoadError, setLoginMediaLoadError] = useState<{
    url: string;
    message: string;
  } | null>(null);

  const inputRef = useRef<ComponentRef<typeof TextInput> | null>(null);
  const otpRequestVersion = useRef(0);
  const imageWidth = Math.max(0, windowWidth - 40);
  const heroHeight = keyboardVisible
    ? Math.max(88, Math.min(156, windowHeight * 0.16, imageWidth / 1.7))
    : Math.max(150, Math.min(300, windowHeight * 0.28, imageWidth / 1.5));

  const validatePhone = (num: string) => {
    const regex = /^[6-9]\d{9}$/;
    return regex.test(num);
  };

  useFocusEffect(
    useCallback(() => {
      otpRequestVersion.current += 1;
      setPhone("");
      setError("");

      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }, []),
  );

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, () =>
      setKeyboardVisible(true),
    );
    const hideSubscription = Keyboard.addListener(hideEvent, () =>
      setKeyboardVisible(false),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    void authScreenMediaApi
      .getActive("login", branchId)
      .then((media) => {
        if (isCurrent) {
          setLoginMediaResult({
            branchId,
            media,
            ...(!media
              ? { error: "No login screen media is configured." }
              : {}),
          });
        }
      })
      .catch((mediaError: unknown) => {
        console.error("Unable to load the active login screen media.", mediaError);
        if (isCurrent) {
          setLoginMediaResult({
            branchId,
            media: null,
            error:
              mediaError instanceof Error
                ? mediaError.message
                : "Unable to load login screen media.",
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [branchId]);

  const currentLoginMediaResult =
    loginMediaResult?.branchId === branchId ? loginMediaResult : null;
  const loginScreenMedia = currentLoginMediaResult?.media ?? null;
  const loginMediaError =
    loginMediaLoadError && loginScreenMedia?.url === loginMediaLoadError.url
      ? loginMediaLoadError.message
      : currentLoginMediaResult?.error;
  const handleLoginMediaError = useCallback(
    (message: string) => {
      if (loginScreenMedia) {
        setLoginMediaLoadError({ url: loginScreenMedia.url, message });
      }
    },
    [loginScreenMedia],
  );

  const handleSendOtp = async () => {
    if (!validatePhone(phone)) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    setError("");
    const requestVersion = otpRequestVersion.current;

    const fullPhoneNumber = `+91${phone}`;

    try {
      await api.sendOtp(fullPhoneNumber);

      if (otpRequestVersion.current !== requestVersion) return;

      router.push({
        pathname: "/(auth)/verify-otp",
        params: {
          phone: fullPhoneNumber,
          ...(branchId ? { branchId } : {}),
        },
      });
    } catch (err) {
      if (otpRequestVersion.current !== requestVersion) return;

      setError(
        err instanceof Error ? err.message : "Failed to send OTP. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      await api.clearLocalSession();
      router.replace({
        pathname: "/(home)/(tabs)",
        params: { isGuest: "true" },
      });
    } catch (sessionError) {
      setError(
        sessionError instanceof Error
          ? sessionError.message
          : "Unable to start a guest session.",
      );
    }
  };

  const legalNotice = (
    <View className="items-center px-5 pt-1">
      <Text
        className="text-center text-[10px]"
        style={{ color: theme.muted }}
      >
        By continuing, you agree to our
      </Text>
      <Pressable onPress={() => console.log("Terms of Use clicked")}>
        <View className="mt-0.5 flex-row items-center justify-center">
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
  );

  return (
    <SafeAreaView
      className="flex-1"
      edges={["top", "left", "right"]}
      style={{ backgroundColor: theme.bg }}
    >
      <StatusBar style={theme.isDark ? "light" : "dark"} />

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        enableOnAndroid
        extraScrollHeight={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          className="flex-grow pb-3"
        >
          <View
            className="relative w-full px-5"
            style={{
              height: heroHeight,
              marginTop: 4,
            }}
          >
            <View className="h-full w-full overflow-hidden rounded-[28px]">
              {loginScreenMedia?.mediaType === "video" ? (
                <LoginScreenVideo
                  key={loginScreenMedia.url}
                  uri={loginScreenMedia.url}
                  onError={handleLoginMediaError}
                />
              ) : loginScreenMedia?.mediaType === "image" ? (
                <Image
                  source={{ uri: loginScreenMedia.url }}
                  className="h-full w-full"
                  resizeMode="cover"
                  onError={() =>
                    handleLoginMediaError("Unable to load login screen media.")
                  }
                />
              ) : (
                <View
                  className="h-full w-full items-center justify-center px-6"
                  style={{ backgroundColor: theme.card }}
                >
                  {!currentLoginMediaResult ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (
                    <Text
                      className="text-center text-sm"
                      style={{ color: theme.muted }}
                    >
                      {loginMediaError || "Login screen media is unavailable."}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>

          <Animated.View
            className="px-5"
            style={{ marginTop: keyboardVisible ? 18 : 34 }}
          >
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
                  otpRequestVersion.current += 1;
                  setPhone(numericText);
                  setError("");
                }}
                keyboardType={"number-pad" as any}
                maxLength={10}
                editable
                autoFocus
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

            {keyboardVisible ? (
              <View className="mt-0.5">{legalNotice}</View>
            ) : null}
          </Animated.View>

          {!keyboardVisible ? (
            <View
              className="pt-1"
              style={{ marginTop: "auto", paddingBottom: insets.bottom + 8 }}
            >
              {legalNotice}
            </View>
          ) : (
            <View style={{ height: insets.bottom + 8 }} />
          )}
        </Animated.View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
