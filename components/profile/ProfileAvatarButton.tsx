import { useFocusEffect, useGlobalSearchParams, useRouter } from "expo-router";
import { UserRound } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  Image,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useAppTheme } from "../../hooks/useAppTheme";
import { api } from "../../services/api";

interface ProfileAvatarButtonProps {
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function ProfileAvatarButton({
  className = "h-11 w-11 items-center justify-center rounded-full border",
  style,
}: ProfileAvatarButtonProps) {
  const router = useRouter();
  const theme = useAppTheme();
  const { isGuest } = useGlobalSearchParams<{ isGuest?: string }>();
  const [avatarUrl, setAvatarUrl] = useState("");
  const [failedAvatarUrl, setFailedAvatarUrl] = useState("");

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadAvatar = async () => {
        try {
          if (isGuest === "true") {
            setAvatarUrl("");
            return;
          }

          const accessToken = await api.getAccessToken();
          if (!accessToken) {
            if (isActive) setAvatarUrl("");
            return;
          }

          const profile = await api.getMyProfile();
          if (isActive) {
            setAvatarUrl(profile.avatarUrl);
            setFailedAvatarUrl("");
          }
        } catch (error) {
          if (isActive) {
            setAvatarUrl("");
            console.error(
              "Unable to load profile avatar",
              error instanceof Error ? error.message : error,
            );
          }
        }
      };

      void loadAvatar();
      return () => {
        isActive = false;
      };
    }, [isGuest]),
  );

  return (
    <Pressable
      onPress={() => router.push("/(home)/(tabs)/profile")}
      accessibilityRole="button"
      accessibilityLabel="Open profile"
      className={className}
      style={[
        { backgroundColor: theme.card, borderColor: theme.border },
        style,
        { overflow: "hidden" },
      ]}
    >
      {avatarUrl && failedAvatarUrl !== avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          onError={() => setFailedAvatarUrl(avatarUrl)}
        />
      ) : (
        <UserRound size={22} color={theme.text} strokeWidth={2} />
      )}
    </Pressable>
  );
}
