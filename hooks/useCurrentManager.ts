import { useCallback, useSyncExternalStore } from "react";
import { useFocusEffect } from "expo-router";

import { type UserProfile, profileApi } from "../services/api/profile";
import { managerProfileApi } from "../services/api/manager-profile";
import { authApi } from "../services/api/auth";
import { isKnownManagerType } from "../services/authRouting";

type CurrentManager = Pick<
  UserProfile,
  "id" | "firstName" | "lastName" | "phone" | "role" | "managerType" | "branchId" | "isActive"
> & {
  name: string;
  avatarUrl?: string;
  assignedTables?: string[];
  assignedWaiters?: string[];
};

interface CurrentManagerSnapshot {
  currentManager: CurrentManager | null;
  loading: boolean;
  error: string;
}

const initialSnapshot: CurrentManagerSnapshot = {
  currentManager: null,
  loading: true,
  error: "",
};

let snapshot = initialSnapshot;
let snapshotToken: string | null = null;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(nextSnapshot: CurrentManagerSnapshot) {
  snapshot = nextSnapshot;
  listeners.forEach((listener) => listener());
}

async function loadCurrentManager(forceRefresh = false): Promise<void> {
  let accessToken: string | null;
  try {
    accessToken = await authApi.getAccessToken();
  } catch (loadError: unknown) {
    publish({
      ...snapshot,
      loading: false,
      error:
        loadError instanceof Error
          ? loadError.message
          : "Unable to verify your account.",
    });
    return;
  }
  if (!accessToken) {
    snapshotToken = null;
    inFlight = null;
    publish({
      currentManager: null,
      loading: false,
      error: "Your login session is missing. Please sign in again.",
    });
    return;
  }

  if (snapshotToken !== accessToken) {
    snapshotToken = accessToken;
    inFlight = null;
    snapshot = initialSnapshot;
  }
  if (!forceRefresh && snapshot.currentManager) return;
  if (inFlight) return inFlight;

  const requestToken = accessToken;
  publish({
    ...snapshot,
    loading: !snapshot.currentManager,
    error: "",
  });

  let request = Promise.resolve();
  request = (async () => {
    try {
      const profile = await profileApi.getMyProfile();
      let currentProfile: CurrentManager;
      if (profile.role.toLowerCase() !== "manager") {
        currentProfile = {
          ...profile,
          name: [profile.firstName, profile.lastName]
            .filter(Boolean)
            .join(" "),
        };
      } else {
        const { manager } = await managerProfileApi.getProfile();
        currentProfile = {
          id: manager.id,
          name:
            manager.name ||
            [manager.firstName, manager.lastName].filter(Boolean).join(" "),
          firstName: manager.firstName,
          lastName: manager.lastName,
          phone: manager.phone,
          role: manager.role,
          managerType: isKnownManagerType(profile.managerType)
            ? profile.managerType
            : manager.managerType,
          branchId: manager.branchId,
          isActive: manager.isActive,
          avatarUrl: manager.avatarUrl,
          assignedTables: manager.assignedTables,
          assignedWaiters: manager.assignedWaiters,
        };
      }
      if (snapshotToken === requestToken) {
        publish({ currentManager: currentProfile, loading: false, error: "" });
      }
    } catch (loadError: unknown) {
      if (snapshotToken === requestToken) {
        publish({
          ...snapshot,
          loading: false,
          error:
            loadError instanceof Error
              ? loadError.message
              : "Unable to verify your account.",
        });
      }
    } finally {
      if (inFlight === request) inFlight = null;
    }
  })();
  inFlight = request;
  return request;
}

export function useCurrentManager() {
  const { currentManager, loading, error } = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => initialSnapshot,
  );
  const refreshCurrentManager = useCallback(
    () => loadCurrentManager(true),
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadCurrentManager();
    }, []),
  );

  return {
    rawPhone: currentManager?.phone,
    normalizedPhone: currentManager?.phone || "",
    currentManager,
    loading,
    error,
    refreshCurrentManager,
    isAdmin:
      currentManager?.role?.toLowerCase() === "admin" &&
      currentManager.isActive !== false,
    isOperations: currentManager?.managerType?.toLowerCase() === "operations",
    isFloor: currentManager?.managerType?.toLowerCase() === "floor",
  };
}
