import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AppState } from "react-native";

import { api } from "../../services/api";
import type { UserProfile } from "../../services/api/profile";

interface ProfileContextValue {
  user: UserProfile | null;
  error: string;
  reloadProfile: (forceRefresh?: boolean) => Promise<void>;
  updateUser: (user: UserProfile) => void;
  clearUser: () => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");

  const reloadProfile = useCallback(async (forceRefresh = false) => {
    setError("");
    try {
      const accessToken = await api.getAccessToken();
      if (!accessToken) {
        setUser(null);
        return;
      }
      setUser(
        await api.getMyProfile(forceRefresh, (profile) => setUser(profile)),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load your profile.",
      );
    }
  }, []);

  useEffect(() => {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (previousState !== "active" && nextState === "active") {
        void reloadProfile();
      }
      previousState = nextState;
    });
    return () => subscription.remove();
  }, [reloadProfile]);

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
