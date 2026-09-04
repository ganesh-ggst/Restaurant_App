import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";

export default function AuthLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const headerBgColor = isDark ? "hsl(150, 31%, 9%)" : "hsl(138, 47%, 97%)";

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
        name="verify-otp"
        options={{
          title: "Verify OTP",
        }}
      />
      <Stack.Screen
        name="basic-details"
        options={{
          title: "Complete Profile",
        }}
      />
    </Stack>
  );
}
