import { useGlobalSearchParams } from "expo-router";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { api } from "../../services/api";
import type { UserProfile } from "../../services/api/profile";

interface ProfileContextValue {
  user: UserProfile | null;
  error: string;
  reloadProfile: () => Promise<void>;
  updateUser: (user: UserProfile) => void;
  clearUser: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { isGuest } = useGlobalSearchParams<{ isGuest?: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");

  const reloadProfile = useCallback(async () => {
    setError("");
    try {
      setUser(await api.getMyProfile());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load your profile.",
      );
    }
  }, []);

  useEffect(() => {
    if (isGuest === "true") {
      return;
    }

    let isActive = true;

    void api
      .getMyProfile()
      .then((profile) => {
        if (isActive) setUser(profile);
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your profile.",
          );
        }
      });

    return () => {
      isActive = false;
    };
  }, [isGuest]);

  const updateUser = useCallback((updatedUser: UserProfile) => {
    setUser(updatedUser);
  }, []);

  const clearUser = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <ProfileContext.Provider
      value={{ user, error, reloadProfile, updateUser, clearUser }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider.");
  }
  return context;
}
