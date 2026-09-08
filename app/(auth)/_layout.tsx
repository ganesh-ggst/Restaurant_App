import { Stack } from "expo-router";
import { useAppTheme } from "../../hooks/useAppTheme";

export default function AuthLayout() {
  const theme = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.bg,
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
