import { Stack } from "expo-router";
import { useAppTheme } from "../../../../hooks/useAppTheme";

export default function ProfileLayout() {
  const theme = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.bg,
        },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="personal" />
      <Stack.Screen name="address" />
      <Stack.Screen name="security" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}
