import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { AuthHeader } from "../../components/auth/AuthHeader";
import { AuthLink } from "../../components/auth/AuthLink";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    general?: string;
  }>({});

  const bgColor = isDark ? "hsl(150, 31%, 9%)" : "hsl(138, 47%, 97%)";
  const textColor = isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)";
  const successColor = isDark ? "hsl(146, 70%, 52%)" : "hsl(146, 80%, 40%)";

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      // Implement password reset logic with Clerk
      // await sendPasswordResetEmail(email);
      setSubmitted(true);
    } catch (error: any) {
      setErrors({
        general:
          error?.message || "Failed to send reset email. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        style={{ backgroundColor: bgColor }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
          className="px-6 py-8"
        >
          <View className="flex-1 items-center justify-center">
            {/* Success Icon */}
            <View
              className="mb-6 rounded-full p-6"
              style={{
                backgroundColor: isDark
                  ? "hsl(149, 27%, 15%)"
                  : "hsl(143, 61%, 91%)",
              }}
            >
              <MaterialCommunityIcons
                name="check-circle"
                size={64}
                color={successColor}
              />
            </View>

            {/* Success Message */}
            <Text
              className="mb-2 text-center text-3xl font-bold"
              style={{ color: textColor }}
            >
              Check Your Email
            </Text>
            <Text
              className="mb-6 text-center text-base"
              style={{
                color: isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)",
              }}
            >
              We've sent a password reset link to:
            </Text>
            <Card variant="elevated" className="mb-6 w-full">
              <Text
                className="text-center font-semibold"
                style={{ color: textColor }}
              >
                {email}
              </Text>
            </Card>
            <Text
              className="mb-8 text-center text-sm"
              style={{
                color: isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)",
              }}
            >
              Please check your email and click the link to reset your password.
              The link will expire in 1 hour.
            </Text>

            <Button
              title="Back to Sign In"
              onPress={() => router.push("/(auth)/login" as any)}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
      style={{ backgroundColor: bgColor }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        className="px-6 py-8"
      >
        <View className="flex-1 justify-center">
          {/* Header */}
          <AuthHeader
            title="Reset Password"
            subtitle="Enter your email to receive a password reset link"
            imageSource={require("../../assets/images/auth/login-hero.jpg")}
          />

          {/* Error Message */}
          {errors.general && (
            <Card variant="subtle" className="mb-6 border-l-4 border-l-red-500">
              <Text
                className="text-sm font-medium"
                style={{
                  color: isDark ? "hsl(7, 85%, 76%)" : "hsl(6, 74%, 54%)",
                }}
              >
                {errors.general}
              </Text>
            </Card>
          )}

          {/* Reset Form */}
          <Card variant="elevated" className="mb-6">
            <Input
              label="Email Address"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              error={errors.email}
              icon={
                <MaterialCommunityIcons
                  name="email-outline"
                  size={20}
                  color={isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)"}
                />
              }
            />

            {/* Reset Button */}
            <View className="mt-6">
              <Button
                title="Send Reset Link"
                onPress={handleResetPassword}
                loading={loading}
              />
            </View>
          </Card>

          {/* Back to Sign In Link */}
          <AuthLink
            text="Remember your password?"
            linkText="Sign In"
            onPress={() => router.push("/(auth)/login" as any)}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
