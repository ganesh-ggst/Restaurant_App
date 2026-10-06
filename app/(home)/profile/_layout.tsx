import { Stack } from "expo-router";

import { ProfileProvider } from "../../../components/profile/ProfileContext";
import { useAppTheme } from "../../../hooks/useAppTheme";

export default function ProfileStackLayout() {
  const theme = useAppTheme();

  return (
    <ProfileProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="personal-info" />
        <Stack.Screen name="addresses" />
        <Stack.Screen name="security" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="address-form" />
      </Stack>
    </ProfileProvider>
  );
}
