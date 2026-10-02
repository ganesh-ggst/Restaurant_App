import { Stack } from "expo-router";
import { useAppTheme } from "../../../hooks/useAppTheme";

export default function DetailsLayout() {
  const theme = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="monthly-sales" />
      <Stack.Screen name="sales-distribution" />
      <Stack.Screen name="today-revenue" />
      <Stack.Screen name="weekly-trend" />
      <Stack.Screen name="yearly-revenue" />
    </Stack>
  );
}
