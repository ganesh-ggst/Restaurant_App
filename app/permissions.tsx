import { useCallback, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAppTheme } from "../hooks/useAppTheme";
import {
  isAuthDestination,
  type AuthDestination,
} from "../services/authRouting";
import {
  requestInitialPermissions,
} from "../services/initial-permissions";

export default function InitialPermissionsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { destination, phone, branchId, isGuest } = useLocalSearchParams<{
    destination?: string;
    phone?: string;
    branchId?: string;
    isGuest?: string;
  }>();
  const continueToDestination = useCallback(
    (nextDestination: AuthDestination) => {
      router.replace({
        pathname: nextDestination,
        params: {
          ...(phone ? { phone } : {}),
          ...(branchId ? { branchId } : {}),
          ...(isGuest === "true" ? { isGuest } : {}),
        },
      });
    },
    [branchId, isGuest, phone, router],
  );

  useEffect(() => {
    let isCurrent = true;
    const timeout = setTimeout(() => {
      void requestInitialPermissions()
        .then((permissionResults) => {
          if (!isCurrent) return;
          permissionResults
            .filter((result) => result.status === "error")
            .forEach((result) =>
              console.error(
                `Initial permission request failed: ${result.label}`,
                result.error,
              ),
            );
        })
        .catch((permissionError: unknown) => {
          if (!isCurrent) return;
          console.error("Unable to finish initial permission requests.", permissionError);
        })
        .finally(() => {
          if (!isCurrent) return;
          continueToDestination(
            isAuthDestination(destination) ? destination : "/(auth)/login",
          );
        });
    }, 0);

    return () => {
      isCurrent = false;
      clearTimeout(timeout);
    };
  }, [continueToDestination, destination]);

  return (
    <View
      className="flex-1 items-center justify-center px-8"
      style={{ backgroundColor: theme.bg }}
    >
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}
