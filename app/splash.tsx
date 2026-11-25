import { useEvent, useEventListener } from "expo";
import { useCallback, useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAppTheme } from "../hooks/useAppTheme";
import { authApi } from "../services/api/auth";
import { authScreenMediaApi } from "../services/api/auth-screen-media";
import { managerProfileApi } from "../services/api/manager-profile";
import { profileApi } from "../services/api/profile";
import {
  getAuthDestination,
  isAuthDestination,
  isKnownManagerType,
  type AuthDestination,
} from "../services/authRouting";
import { hasCompletedInitialPermissions } from "../services/initial-permissions";

function isExpiredSessionError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /invalid access token|token has expired|session has ended|session has expired|login session has expired/i.test(
      error.message,
    )
  );
}

function SplashVideo({
  uri,
  onPlaybackError,
  onPlaybackEnd,
}: {
  uri: string;
  onPlaybackError: (message: string) => void;
  onPlaybackEnd: () => void;
}) {
  const player = useVideoPlayer({ uri, useCaching: true }, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.muted = true;
  });
  const { status, error } = useEvent(player, "statusChange", {
    status: player.status,
  });

  useEventListener(player, "playToEnd", onPlaybackEnd);

  useEffect(() => {
    if (status === "readyToPlay") player.play();
    if (status === "error") {
      onPlaybackError(error?.message ?? "The intro video could not be played.");
    }
  }, [error?.message, onPlaybackError, player, status]);

  return (
    <VideoView
      contentFit="cover"
      nativeControls={false}
      player={player}
      style={styles.video}
    />
  );
}

export default function AuthSplashScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const {
    destination: routeDestination,
    phone,
    branchId: routeBranchId,
    isGuest: routeIsGuest,
  } = useLocalSearchParams<{
    destination?: string;
    phone?: string;
    branchId?: string;
    isGuest?: string;
  }>();
  const hasNavigated = useRef(false);
  const [destination, setDestination] = useState<AuthDestination | undefined>(
    () =>
      isAuthDestination(routeDestination) ? routeDestination : undefined,
  );
  const [branchId, setBranchId] = useState(routeBranchId);
  const [isGuest, setIsGuest] = useState(routeIsGuest === "true");
  const [sessionLoading, setSessionLoading] = useState(
    !isAuthDestination(routeDestination),
  );
  const [sessionError, setSessionError] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const restoreSession = useCallback(async () => {
    setSessionLoading(true);
    setSessionError("");

    try {
      const accessToken = await authApi.getAccessToken();
      if (!accessToken) {
        setDestination("/(home)/(tabs)");
        setIsGuest(true);
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

      setDestination(getAuthDestination(profile.role, managerType));
      setBranchId(routeBranchId || profile.branchId || undefined);
      setIsGuest(false);
    } catch (error) {
      if (isExpiredSessionError(error)) {
        try {
          await authApi.clearLocalSession();
        } catch (clearError) {
          setSessionError(
            clearError instanceof Error
              ? clearError.message
              : "Unable to clear the expired login session.",
          );
          return;
        }

        setDestination("/(auth)/login");
        setIsGuest(false);
        return;
      }

      setSessionError(
        error instanceof Error
          ? error.message
          : "Unable to restore your login session.",
      );
    } finally {
      setSessionLoading(false);
    }
  }, [routeBranchId]);

  useEffect(() => {
    if (!isAuthDestination(routeDestination)) {
      const timeout = setTimeout(() => {
        void restoreSession();
      }, 0);

      return () => clearTimeout(timeout);
    }

    return undefined;
  }, [restoreSession, routeDestination]);

  const continueToDestination = useCallback(() => {
    if (!isAuthDestination(destination) || hasNavigated.current) return;

    hasNavigated.current = true;
    const params = {
      destination,
      ...(phone ? { phone } : {}),
      ...(isGuest ? { isGuest: "true" } : {}),
      ...(branchId ? { branchId } : {}),
    };

    void hasCompletedInitialPermissions()
      .then((permissionsCompleted) => {
        if (permissionsCompleted) {
          router.replace({
            pathname: destination,
            params: {
              ...(phone ? { phone } : {}),
              ...(isGuest ? { isGuest: "true" } : {}),
              ...(branchId ? { branchId } : {}),
            },
          });
        } else {
          router.replace({
            pathname: "/permissions",
            params,
          });
        }
      })
      .catch((error: unknown) => {
        hasNavigated.current = false;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to check whether permission setup is complete.",
        );
      });
  }, [branchId, destination, isGuest, phone, router]);

  useEffect(() => {
    if (!isAuthDestination(destination) || sessionLoading || sessionError) {
      return;
    }

    let isCurrent = true;

    const loadSplashVideo = async () => {
      setMediaLoading(true);
      setErrorMessage("");
      const applySplashMedia = (
        media: Awaited<ReturnType<typeof authScreenMediaApi.getActive>>,
      ) => {
        if (!isCurrent) return;
        if (!media || media.mediaType !== "video") {
          setVideoUrl(null);
          setErrorMessage("No active splash screen video is available.");
          return;
        }
        setErrorMessage("");
        setVideoUrl(media.url);
      };
      try {
        const media = await authScreenMediaApi.getActive(
          "splash",
          branchId,
          false,
          applySplashMedia,
        );
        applySplashMedia(media);
      } catch (error) {
        if (isCurrent) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load the splash screen video.",
          );
        }
      } finally {
        if (isCurrent) setMediaLoading(false);
      }
    };

    void loadSplashVideo();
    return () => {
      isCurrent = false;
    };
  }, [branchId, destination, sessionError, sessionLoading]);

  const displayedError = sessionError || errorMessage;
  const loading = sessionLoading || mediaLoading;
  const handleContinue = sessionError
    ? () => void restoreSession()
    : continueToDestination;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar hidden />
      {videoUrl ? (
        <SplashVideo
          uri={videoUrl}
          onPlaybackError={setErrorMessage}
          onPlaybackEnd={continueToDestination}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator
          color={theme.primary}
          size="large"
          style={styles.loading}
        />
      ) : null}
      {displayedError ? (
        <View style={styles.errorOverlay}>
          <Text style={[styles.errorText, { color: theme.text }]}>
            {sessionError
              ? "Unable to restore your session. Check your connection and try again."
              : displayedError}
          </Text>
          {sessionError ? (
            <Text style={[styles.errorText, { color: theme.muted }]}>
              {sessionError}
            </Text>
          ) : null}
          <Pressable
            onPress={handleContinue}
            style={[styles.continueButton, { backgroundColor: theme.primary }]}
          >
            <Text
              style={[
                styles.continueText,
                { color: theme.primaryForeground },
              ]}
            >
              {sessionError ? "Retry" : "Continue"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  video: {
    ...StyleSheet.absoluteFill,
  },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  errorOverlay: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 40,
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
  },
  continueButton: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  continueText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
