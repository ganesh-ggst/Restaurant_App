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

import { authScreenMediaApi } from "../services/api/auth-screen-media";
import { isAuthDestination } from "../services/authRouting";

function SplashVideo({
  uri,
  onPlaybackError,
  onPlaybackEnd,
}: {
  uri: string;
  onPlaybackError: (message: string) => void;
  onPlaybackEnd: () => void;
}) {
  const player = useVideoPlayer({ uri }, (videoPlayer) => {
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
  const { destination, phone, branchId } = useLocalSearchParams<{
    destination?: string;
    phone?: string;
    branchId?: string;
  }>();
  const hasNavigated = useRef(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const continueToDestination = useCallback(() => {
    if (!isAuthDestination(destination) || hasNavigated.current) return;

    hasNavigated.current = true;
    router.replace({
      pathname: destination,
      params: phone ? { phone } : {},
    });
  }, [destination, phone, router]);

  useEffect(() => {
    let isCurrent = true;

    const loadSplashVideo = async () => {
      try {
        const media = await authScreenMediaApi.getActive("splash", branchId);
        if (!isCurrent) return;
        if (!media || media.mediaType !== "video") {
          setErrorMessage("No active splash screen video is available.");
          return;
        }
        setVideoUrl(media.url);
      } catch (error) {
        if (isCurrent) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load the splash screen video.",
          );
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    void loadSplashVideo();
    return () => {
      isCurrent = false;
    };
  }, [branchId]);

  const handleContinue = isAuthDestination(destination)
    ? continueToDestination
    : () => router.replace("/(auth)/login");
  const displayedError =
    errorMessage ||
    (isAuthDestination(destination)
      ? ""
      : "Unable to determine where to continue. Please sign in again.");

  return (
    <View style={styles.container}>
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
          color="#ffffff"
          size="large"
          style={styles.loading}
        />
      ) : null}
      {displayedError ? (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>{displayedError}</Text>
          <Pressable onPress={handleContinue} style={styles.continueButton}>
            <Text style={styles.continueText}>
              {isAuthDestination(destination) ? "Continue" : "Back to sign in"}
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
    backgroundColor: "#2c0828",
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
    color: "#ffffff",
    fontSize: 14,
    textAlign: "center",
  },
  continueButton: {
    borderRadius: 12,
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  continueText: {
    color: "#2c0828",
    fontSize: 14,
    fontWeight: "700",
  },
});
