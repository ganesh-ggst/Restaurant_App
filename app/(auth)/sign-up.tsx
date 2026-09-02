import { useSignUp } from "@clerk/expo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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

export default function SignUpScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { signUp } = useSignUp();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
    general?: string;
  }>({});

  const bgColor = isDark ? "hsl(150, 31%, 9%)" : "hsl(138, 47%, 97%)";
  const textColor = isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)";
  const primaryColor = isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)";

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!acceptTerms) {
      newErrors.terms = "Please accept the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      // DEVELOPMENT MODE: Bypass Clerk authentication
      // In production, replace this with actual Clerk API call:
      // const result = await signUp?.create({ emailAddress: email, password, firstName, lastName });

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For now, any valid form data will signup successfully
      router.replace("/(home)" as any);
    } catch (error: any) {
      setErrors({
        general:
          error?.message ||
          "An error occurred during sign up. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignUp = (provider: string) => {
    console.log(`Sign up with ${provider}`);
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
            title="Create Account"
            subtitle="Join us and start ordering delicious meals"
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

          {/* Sign Up Form */}
          <Card variant="elevated" className="mb-6">
            {/* Name Fields Row */}
            <View className="mb-4 flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="First Name"
                  placeholder="John"
                  value={firstName}
                  onChangeText={setFirstName}
                  error={errors.firstName}
                  icon={
                    <MaterialCommunityIcons
                      name="account-outline"
                      size={20}
                      color={primaryColor}
                    />
                  }
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Last Name"
                  placeholder="Doe"
                  value={lastName}
                  onChangeText={setLastName}
                  error={errors.lastName}
                  icon={
                    <MaterialCommunityIcons
                      name="account-outline"
                      size={20}
                      color={primaryColor}
                    />
                  }
                />
              </View>
            </View>

            {/* Email Field */}
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
                  color={primaryColor}
                />
              }
            />

            {/* Password Field */}
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
                  color={primaryColor}
                />
              }
            />

            {/* Confirm Password Field */}
            <Input
              label="Confirm Password"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              error={errors.confirmPassword}
              icon={
                <MaterialCommunityIcons
                  name="lock-check-outline"
                  size={20}
                  color={primaryColor}
                />
              }
            />

            {/* Terms and Conditions */}
            <View className="my-4 flex-row items-center">
              <Pressable
                onPress={() => setAcceptTerms(!acceptTerms)}
                className="mr-3 rounded-lg border-2 p-1"
                style={{
                  borderColor: acceptTerms
                    ? primaryColor
                    : isDark
                      ? "hsl(149, 16%, 24%)"
                      : "hsl(141, 47%, 83%)",
                  backgroundColor: acceptTerms ? primaryColor : "transparent",
                }}
              >
                <MaterialCommunityIcons
                  name={acceptTerms ? "check" : "checkbox-blank-outline"}
                  size={18}
                  color={acceptTerms ? "hsl(0, 0%, 100%)" : primaryColor}
                />
              </Pressable>
              <View className="flex-1">
                <Text
                  className="text-sm"
                  style={{
                    color: isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)",
                  }}
                >
                  I agree to the{" "}
                  <Text className="font-bold" style={{ color: primaryColor }}>
                    Terms & Conditions
                  </Text>
                </Text>
              </View>
            </View>
            {errors.terms && (
              <Text
                className="text-xs font-medium"
                style={{
                  color: isDark ? "hsl(7, 85%, 76%)" : "hsl(6, 74%, 54%)",
                  marginBottom: 16,
                }}
              >
                {errors.terms}
              </Text>
            )}

            {/* Sign Up Button */}
            <Button
              title="Create Account"
              onPress={handleSignUp}
              loading={loading}
            />
          </Card>

          {/* Social Sign Up Divider */}
          <AuthDivider text="Or sign up with" />

          {/* Social Sign Up Buttons */}
          <View className="mb-6 flex-row gap-3">
            <SocialButton
              icon="google"
              provider="Google"
              onPress={() => handleSocialSignUp("google")}
            />
            <SocialButton
              icon="apple"
              provider="Apple"
              onPress={() => handleSocialSignUp("apple")}
            />
            <SocialButton
              icon="github"
              provider="GitHub"
              onPress={() => handleSocialSignUp("github")}
            />
          </View>

          {/* Sign In Link */}
          <AuthLink
            text="Already have an account?"
            linkText="Sign In"
            onPress={() => router.push("/(auth)/login" as any)}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
