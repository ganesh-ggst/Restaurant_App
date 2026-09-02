import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";

export default function AuthLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const headerBgColor = isDark ? "hsl(150, 31%, 9%)" : "hsl(138, 47%, 97%)";
  const headerTextColor = isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)";
  const tintColor = isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)";

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: headerBgColor,
        },
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          title: "Sign In",
        }}
      />
      <Stack.Screen
        name="sign-up"
        options={{
          title: "Create Account",
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: "Reset Password",
        }}
      />
    </Stack>
  );
}
