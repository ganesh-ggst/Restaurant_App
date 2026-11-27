import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ShieldCheck, Smartphone } from "lucide-react-native";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProfileScreenHeader, formatProfilePhone } from "./ProfileUi";
import { useAppTheme } from "../../hooks/useAppTheme";
import { profileApi } from "../../services/api/profile";
import { Button } from "../ui/Button";

interface PhoneChangeScreenProps {
  currentPhone: string;
  onPhoneChanged?: (phone: string) => void;
}

export default function PhoneChangeScreen({
  currentPhone,
  onPhoneChanged,
}: PhoneChangeScreenProps) {
  const router = useRouter();
  const theme = useAppTheme();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [requestedPhone, setRequestedPhone] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const cleanPhone = phone.replace(/\D/g, "").slice(0, 10);
  const cleanOtp = otp.replace(/\D/g, "").slice(0, 6);

  const sendOtp = async () => {
    if (!/^\d{10}$/.test(cleanPhone)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (cleanPhone === currentPhone.replace(/\D/g, "").slice(-10)) {
      setError("Enter a number different from your current mobile number.");
      return;
    }

    setError("");
    setIsLoading(true);
    try {
      await profileApi.sendPhoneChangeOtp(cleanPhone);
      setRequestedPhone(cleanPhone);
      setIsOtpSent(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send the verification code. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(cleanOtp)) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setError("");
    setIsLoading(true);
    try {
      await profileApi.verifyPhoneChangeOtp(requestedPhone, cleanOtp);
      onPhoneChanged?.(requestedPhone);
      setPhone("");
      setOtp("");
      setRequestedPhone("");
      setIsOtpSent(false);
      router.back();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to verify the code. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const changeNumber = () => {
    setError("");
    setOtp("");
    setRequestedPhone("");
    setIsOtpSent(false);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <ProfileScreenHeader
        title="Security Settings"
        onBack={() => router.back()}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            className="mb-6 rounded-3xl border p-5"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <View className="mb-4 h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: theme.secondaryBg }}
            >
              <ShieldCheck size={24} color={theme.primary} />
            </View>
            <Text className="text-lg font-black" style={{ color: theme.text }}>
              Change mobile number
            </Text>
            <Text className="mt-2 text-sm leading-5" style={{ color: theme.muted }}>
              {currentPhone
                ? `Your current number is ${formatProfilePhone(currentPhone)}. `
                : ""}
              We’ll send a verification code to your new number.
            </Text>
          </View>

          <View
            className="rounded-3xl border p-5"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            {!isOtpSent ? (
              <>
                <View className="mb-2 flex-row items-center">
                  <Smartphone size={19} color={theme.primary} />
                  <Text
                    className="ml-2 text-base font-bold"
                    style={{ color: theme.text }}
                  >
                    New mobile number
                  </Text>
                </View>
                <PhoneInput
                  value={phone}
                  onChangeText={(value) => {
                    setPhone(value.replace(/\D/g, "").slice(0, 10));
                    setError("");
                  }}
                  placeholder="10-digit mobile number"
                  theme={theme}
                  maxLength={10}
                  editable={!isLoading}
                />
                <Text className="mb-5 text-xs" style={{ color: theme.muted }}>
                  Enter your 10-digit number, including area code.
                </Text>
                {error ? <InlineError message={error} color={theme.danger} /> : null}
                <Button
                  title="Send verification code"
                  onPress={() => void sendOtp()}
                  loading={isLoading}
                  disabled={cleanPhone.length !== 10}
                />
              </>
            ) : (
              <>
                <Text className="text-base font-bold" style={{ color: theme.text }}>
                  Verify your new number
                </Text>
                <Text className="mt-2 mb-5 text-sm" style={{ color: theme.muted }}>
                  Enter the 6-digit code sent to {formatProfilePhone(requestedPhone)}.
                </Text>
                <PhoneInput
                  value={otp}
                  onChangeText={(value) => {
                    setOtp(value.replace(/\D/g, "").slice(0, 6));
                    setError("");
                  }}
                  placeholder="6-digit verification code"
                  theme={theme}
                  maxLength={6}
                  editable={!isLoading}
                />
                {error ? <InlineError message={error} color={theme.danger} /> : null}
                <Button
                  title="Verify and update number"
                  onPress={() => void verifyOtp()}
                  loading={isLoading}
                  disabled={cleanOtp.length !== 6}
                />
                <Pressable
                  onPress={() => void sendOtp()}
                  disabled={isLoading}
                  className="mt-5 items-center py-2"
                >
                  <Text className="font-bold" style={{ color: theme.primary }}>
                    Resend code
                  </Text>
                </Pressable>
                <Pressable
                  onPress={changeNumber}
                  disabled={isLoading}
                  className="mt-1 items-center py-2"
                >
                  <Text className="font-semibold" style={{ color: theme.muted }}>
                    Use a different number
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PhoneInput({
  value,
  onChangeText,
  placeholder,
  theme,
  maxLength,
  editable,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  theme: ReturnType<typeof useAppTheme>;
  maxLength: number;
  editable: boolean;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.muted}
      keyboardType="number-pad"
      autoCapitalize="none"
      maxLength={maxLength}
      editable={editable}
      style={{
        backgroundColor: theme.bg,
        borderColor: theme.border,
        color: theme.text,
        paddingVertical: 15,
        fontSize: 17,
        fontWeight: "600",
      }}
      className="mb-2 rounded-2xl border px-4"
    />
  );
}

function InlineError({ message, color }: { message: string; color: string }) {
  return (
    <Text className="mb-4 text-sm font-medium" style={{ color }}>
      {message}
    </Text>
  );
}
