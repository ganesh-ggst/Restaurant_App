import { Feather } from "@expo/vector-icons";
import { Redirect, Stack, useSegments } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useCurrentManager } from "../../hooks/useCurrentManager";
import { useAppTheme } from "../../hooks/useAppTheme";
import { normalizeManagerType } from "../../services/authRouting";

export default function ManagerLayout() {
  const theme = useAppTheme();
  const segments = useSegments();
  const { currentManager, loading, error, refreshCurrentManager } =
    useCurrentManager();

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.bg }}
      >
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!currentManager) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: theme.bg }}
      >
        <Feather name="alert-circle" size={32} color={theme.danger} />
        <Text className="mt-3 text-center" style={{ color: theme.text }}>
          {error || "Unable to verify your manager account."}
        </Text>
        <Pressable
          onPress={() => void refreshCurrentManager()}
          className="mt-5 rounded-xl px-5 py-3"
          style={{ backgroundColor: theme.primary }}
        >
          <Text className="font-bold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }

  const expectedScreen = normalizeManagerType(currentManager.managerType).includes(
    "floor",
  )
    ? "floor"
    : "operations";
  const activeManagerScreen = segments.find(
    (segment) => segment === "floor" || segment === "operations",
  );

  if (activeManagerScreen !== expectedScreen) {
    return (
      <Redirect
        href={
          expectedScreen === "floor"
            ? "/(manager)/floor"
            : "/(manager)/operations"
        }
      />
    );
  }

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
