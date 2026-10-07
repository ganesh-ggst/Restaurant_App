import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAppTheme } from "../../../hooks/useAppTheme";
import { useCurrentManager } from "../../../hooks/useCurrentManager";

export default function DetailsLayout() {
  const theme = useAppTheme();
  const router = useRouter();
  const { loading, isAdmin } = useCurrentManager();

  useEffect(() => {
    if (!loading && !isAdmin) router.replace("/(auth)/login" as any);
  }, [isAdmin, loading, router]);

  if (loading || !isAdmin) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.bg }}
      >
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

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
