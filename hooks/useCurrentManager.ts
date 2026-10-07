import { useEffect, useState } from "react";

import { type UserProfile, profileApi } from "../services/api/profile";

type CurrentManager = Pick<
  UserProfile,
  "id" | "firstName" | "lastName" | "phone" | "role" | "managerType" | "branchId" | "isActive"
> & {
  name: string;
  assignedTables?: string[];
  assignedWaiters?: string[];
};

export function useCurrentManager() {
  const [currentManager, setCurrentManager] =
    useState<CurrentManager | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCurrent = true;

    profileApi
      .getMyProfile()
      .then((profile) => {
        if (!isCurrent) return;
        setCurrentManager({
          ...profile,
          name: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
        });
        setError("");
      })
      .catch((loadError: unknown) => {
        if (!isCurrent) return;
        setCurrentManager(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to verify your account.",
        );
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  return {
    rawPhone: currentManager?.phone,
    normalizedPhone: currentManager?.phone || "",
    currentManager,
    loading,
    error,
    isAdmin:
      currentManager?.role?.toLowerCase() === "admin" &&
      currentManager.isActive !== false,
    isOperations: currentManager?.managerType?.toLowerCase() === "operations",
    isFloor: currentManager?.managerType?.toLowerCase() === "floor",
  };
}
