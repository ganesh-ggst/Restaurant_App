import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useAppTheme } from "../hooks/useAppTheme";
import { authApi } from "../services/api/auth";
import { managerProfileApi } from "../services/api/manager-profile";
import { profileApi } from "../services/api/profile";
import {
  getAuthDestination,
  isKnownManagerType,
} from "../services/authRouting";

function isExpiredSessionError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /invalid access token|session has ended|session has expired|login session has expired/i.test(
      error.message,
    )
  );
}

export default function RootRedirect() {
  const router = useRouter();
  const theme = useAppTheme();
  const [error, setError] = useState("");

  const restoreSession = useCallback(async () => {
    try {
      const accessToken = await authApi.getAccessToken();
      if (!accessToken) {
        router.replace("/(auth)/login");
        return;
      }

      const profile = await profileApi.getMyProfile(true);
      let managerType = profile.managerType;
      if (
        profile.role.toLowerCase() === "manager" &&
        !isKnownManagerType(managerType)
      ) {
        const { manager } = await managerProfileApi.getProfile();
        managerType = manager.managerType;
      }

      router.replace(getAuthDestination(profile.role, managerType));
    } catch (restoreError) {
      if (isExpiredSessionError(restoreError)) {
        try {
          await authApi.clearLocalSession();
        } catch (clearError) {
          setError(
            clearError instanceof Error
              ? clearError.message
              : "Unable to clear the expired login session.",
          );
          return;
        }
        router.replace("/(auth)/login");
        return;
      }

      setError(
        restoreError instanceof Error
          ? restoreError.message
          : "Unable to restore your login session.",
      );
    }
  }, [router]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void restoreSession();
    }, 0);

    return () => clearTimeout(timeout);
  }, [restoreSession]);

  return (
    <View
      className="flex-1 items-center justify-center px-8"
      style={{ backgroundColor: theme.bg }}
    >
      {error ? (
        <>
          <Text
            className="mb-5 text-center text-base"
            style={{ color: theme.text }}
          >
            Unable to restore your session. Check your connection and try again.
          </Text>
          <Text
            className="mb-5 text-center text-sm"
            style={{ color: theme.muted }}
          >
            {error}
          </Text>
          <Pressable
            onPress={() => {
              setError("");
              void restoreSession();
            }}
            className="rounded-xl px-6 py-3"
            style={{ backgroundColor: theme.primary }}
          >
            <Text className="font-bold" style={{ color: theme.primaryForeground }}>
              Retry
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text className="mt-4 text-sm" style={{ color: theme.muted }}>
            Restoring your session...
          </Text>
        </>
      )}
    </View>
  );
}
