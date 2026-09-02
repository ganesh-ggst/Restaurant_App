import { useSignIn } from "@clerk/expo";
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
import { AuthDivider } from "../../components/auth/AuthDivider";
import { AuthHeader } from "../../components/auth/AuthHeader";
import { AuthLink } from "../../components/auth/AuthLink";
import { SocialButton } from "../../components/auth/SocialButton";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";

export default function LoginScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { signIn } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  const bgColor = isDark ? "hsl(150, 31%, 9%)" : "hsl(138, 47%, 97%)";
  const textColor = isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)";

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      // DEVELOPMENT MODE: Bypass Clerk authentication
      // In production, replace this with actual Clerk API call:
      // const result = await signIn?.create({ identifier: email, password });

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For now, any valid email/password will login successfully
      router.replace("/(home)" as any);
    } catch (error: any) {
      setErrors({
        general:
          error?.message || "An error occurred during login. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    // Implement social login with Clerk
    console.log(`Login with ${provider}`);
  };

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
            title="Welcome Back"
            subtitle="Sign in to your Restaurant account"
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

          {/* Login Form */}
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

            <Input
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={errors.password}
              icon={
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color={isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)"}
                />
              }
            />

            {/* Forgot Password Link */}
            <View className="mt-2 items-end">
              <Text
                className="text-sm font-semibold"
                onPress={() => router.push("/(auth)/forgot-password" as any)}
                style={{
                  color: isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)",
                }}
              >
                Forgot Password?
              </Text>
            </View>

            {/* Sign In Button */}
            <View className="mt-8">
              <Button
                title="Sign In"
                onPress={handleSignIn}
                loading={loading}
              />
            </View>
          </Card>

          {/* Social Login Divider */}
          <AuthDivider text="Or continue with" />

          {/* Social Login Buttons */}
          <View className="mb-8 flex-row gap-3">
            <SocialButton
              icon="google"
              provider="Google"
              onPress={() => handleSocialLogin("google")}
            />
            <SocialButton
              icon="apple"
              provider="Apple"
              onPress={() => handleSocialLogin("apple")}
            />
            <SocialButton
              icon="github"
              provider="GitHub"
              onPress={() => handleSocialLogin("github")}
            />
          </View>

          {/* Sign Up Link */}
          <AuthLink
            text="Don't have an account?"
            linkText="Sign Up"
            onPress={() => router.push("/(auth)/sign-up" as any)}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
