import { Stack } from "expo-router";
import { useAppTheme } from "../../hooks/useAppTheme";

export default function ManagerLayout() {
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
      <Stack.Screen name="floor" />
      <Stack.Screen name="operations" />
    </Stack>
  );
}
