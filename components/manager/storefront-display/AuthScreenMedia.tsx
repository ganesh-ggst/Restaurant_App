import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useEvent } from "expo";
import { VideoView, useVideoPlayer } from "expo-video";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../../../hooks/useAppTheme";
import type { AdminAuthScreenUpload } from "../../../services/api/admin-profile";
import { adminProfileApi } from "../../../services/api/admin-profile";
import { authScreenMediaApi } from "../../../services/api/auth-screen-media";
import {
  activateAuthScreenVideo,
  getAuthScreenMediaState,
  getScreenMediaFileName,
  getScreenMediaType,
  subscribeToAuthScreenMedia,
  updateAuthScreenVideos,
  type AuthScreenKind,
  type AuthScreenVideo,
} from "../../../services/auth-screen-media";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";

interface SelectedMedia {
  uri: string;
  fileName: string;
  mediaType: "image" | "video";
  durationMs: number | null;
  uploadFile: AdminAuthScreenUpload | null;
}

function MediaPreview({
  mediaType,
  uri,
}: {
  mediaType: "image" | "video";
  uri: string;
}) {
  if (mediaType === "video") return <VideoPreview uri={uri} />;
  return <ImagePreview uri={uri} />;
}

function ImagePreview({ uri }: { uri: string }) {
  const theme = useAppTheme();
  const [loadError, setLoadError] = useState(false);

  return (
    <View
      style={{
        width: "100%",
        height: 190,
        borderRadius: 12,
        backgroundColor: theme.bg,
        overflow: "hidden",
      }}
    >
      <Image
        source={{ uri }}
        resizeMode="contain"
        onError={() => setLoadError(true)}
        style={{ width: "100%", height: "100%" }}
      />
      {loadError ? (
        <View className="absolute inset-0 items-center justify-center px-4">
          <Text
            className="text-center text-sm font-semibold"
            style={{ color: theme.muted }}
          >
            Preview unavailable. Check that the backend media URL is accessible.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer({ uri }, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.play();
  });
  const { status, error } = useEvent(player, "statusChange", {
    status: player.status,
  });

  return (
    <View
      style={{
        width: "100%",
        height: 190,
        overflow: "hidden",
        borderRadius: 12,
      }}
    >
      <VideoView
        player={player}
        contentFit="contain"
        nativeControls
        style={{ width: "100%", height: "100%" }}
      />
      {status === "error" ? (
        <View
          className="absolute inset-0 items-center justify-center px-4"
          style={{ backgroundColor: "rgba(0,0,0,0.78)" }}
        >
          <Text className="text-center text-sm font-semibold text-white">
            Preview unavailable. The media server may be denying access.
          </Text>
          {error?.message ? (
            <Text className="mt-2 text-center text-xs text-white">
              {error.message}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function toLocalMedia(
  screen: AuthScreenKind,
  item: { id: string; url: string; isActive: boolean },
): AuthScreenVideo {
  const mediaType = getScreenMediaType(screen, item.url);
  return {
    id: item.id,
    uri: item.url,
    fileName: getScreenMediaFileName(item.url),
    mediaType,
    durationMs: null,
    isActive: item.isActive,
  };
}

const MAX_SPLASH_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_LOGIN_MEDIA_SIZE = 10 * 1024 * 1024;

function supportedExtension(fileName: string, screen: AuthScreenKind) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const videoExtensions = ["mp4", "webm", "mov"];
  return screen === "splash"
    ? videoExtensions.includes(extension)
    : ["jpg", "jpeg", "png", "webp", ...videoExtensions].includes(extension);
}

function mimeTypeForAsset(
  asset: ImagePicker.ImagePickerAsset,
  fileName: string,
): string {
  if (asset.mimeType) return asset.mimeType;
  const extension = fileName.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "webm":
      return "video/webm";
    case "mov":
      return "video/quicktime";
    default:
      return asset.type === "image" ? "image/jpeg" : "video/mp4";
  }
}

function extensionForMimeType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "video/webm":
      return "webm";
    case "video/quicktime":
      return "mov";
    default:
      return "mp4";
  }
}

export default function AuthScreenMedia({
  screen,
}: {
  screen: AuthScreenKind;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const state = useSyncExternalStore(
    subscribeToAuthScreenMedia,
    getAuthScreenMediaState,
    getAuthScreenMediaState,
  );
  const videos = state[screen];
  const title = screen === "splash" ? "Splash Screen" : "Login Screen";

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pickingMedia, setPickingMedia] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingMediaId, setPendingMediaId] = useState<string | null>(null);
  const previewRequestId = useRef(0);

  const loadMedia = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        let media = await adminProfileApi.getAuthScreenMedia(screen, refresh);
        const activeMedia = media.filter((item) => item.isActive);
        if (activeMedia.length > 1) {
          await Promise.all(
            activeMedia.slice(1).map((item) =>
              adminProfileApi.updateAuthScreenMedia(screen, item.id, {
                isActive: false,
              }),
            ),
          );
          media = await adminProfileApi.getAuthScreenMedia(screen, true);
        }
        updateAuthScreenVideos(
          screen,
          media.map((item) => toLocalMedia(screen, item)),
        );
      } catch (error) {
        Alert.alert(
          `Unable to load ${title.toLowerCase()}`,
          error instanceof Error ? error.message : "Please try again.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [screen, title],
  );

  useFocusEffect(
    useCallback(() => {
      void loadMedia();
    }, [loadMedia]),
  );

  const openEditor = (media?: AuthScreenVideo) => {
    const requestId = ++previewRequestId.current;
    setEditingVideoId(media?.id ?? null);
    setSelectedMedia(
      media
        ? {
            uri: media.uri,
            fileName: media.fileName,
            mediaType: media.mediaType,
            durationMs: media.durationMs,
            uploadFile: null,
          }
        : null,
    );
    setIsEditorOpen(true);

    if (screen === "login" && media?.isActive) {
      void authScreenMediaApi
        .getActive("login")
        .then((activeMedia) => {
          if (!activeMedia || requestId !== previewRequestId.current) return;
          setSelectedMedia((current) =>
            current
              ? {
                  ...current,
                  uri: activeMedia.url,
                  fileName: getScreenMediaFileName(activeMedia.url),
                  mediaType: activeMedia.mediaType,
                }
              : current,
          );
        })
        .catch((error: unknown) => {
          console.error(
            "Unable to load the active login screen preview.",
            error,
          );
        });
    }
  };

  const closeEditor = () => {
    previewRequestId.current += 1;
    setIsEditorOpen(false);
  };

  const chooseMedia = async () => {
    if (pickingMedia || saving) return;

    previewRequestId.current += 1;
    setPickingMedia(true);
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync(false);
      if (!permission.granted) {
        Alert.alert(
          "Media library access required",
          "Allow access to your media library to choose screen media.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: screen === "splash" ? ["videos"] : ["images", "videos"],
        allowsEditing: false,
        videoExportPreset: ImagePicker.VideoExportPreset.Passthrough,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset || (screen === "splash" && asset.type !== "video")) {
        Alert.alert("Invalid media", "Choose a video for the splash screen.");
        return;
      }

      const initialFileName = asset.fileName || "";
      const mimeType = mimeTypeForAsset(asset, initialFileName);
      const extension = extensionForMimeType(mimeType);
      const fileName = /\.[a-z0-9]+$/i.test(initialFileName)
        ? initialFileName
        : initialFileName
          ? `${initialFileName}.${extension}`
          : `screen-media-${Date.now()}.${extension}`;
      if (!supportedExtension(fileName, screen)) {
        Alert.alert(
          "Unsupported format",
          screen === "splash"
            ? "Choose an MP4, WEBM, or MOV video."
            : "Choose a JPEG, PNG, WEBP, MP4, WEBM, or MOV file.",
        );
        return;
      }

      const fileInfo = asset.fileSize
        ? null
        : await FileSystem.getInfoAsync(asset.uri);
      if (fileInfo && !fileInfo.exists) {
        throw new Error("The selected media file is no longer available.");
      }
      const fileSize = asset.fileSize ?? (fileInfo?.exists ? fileInfo.size : 0);
      if (fileSize <= 0) {
        throw new Error("Unable to determine the selected media file size.");
      }

      const maxSize =
        screen === "splash" ? MAX_SPLASH_VIDEO_SIZE : MAX_LOGIN_MEDIA_SIZE;
      if (fileSize > maxSize) {
        Alert.alert(
          "File is too large",
          `The maximum ${screen === "splash" ? "splash video" : "login media"} size is ${screen === "splash" ? "50 MB" : "10 MB"}.`,
        );
        return;
      }

      const resolvedMimeType = mimeTypeForAsset(asset, fileName);
      const mediaType = asset.type === "video" ? "video" : "image";
      if (screen === "splash" && mediaType !== "video") {
        Alert.alert("Invalid media", "Choose a video for the splash screen.");
        return;
      }

      setSelectedMedia({
        uri: asset.uri,
        fileName,
        mediaType,
        durationMs: asset.duration ?? null,
        uploadFile: {
          uri: asset.uri,
          fileName,
          mimeType: resolvedMimeType,
        },
      });
    } catch (error) {
      Alert.alert(
        "Unable to choose media",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setPickingMedia(false);
    }
  };

  const saveMedia = async () => {
    if (!selectedMedia?.uploadFile || saving) return;

    setSaving(true);
    try {
      if (editingVideoId) {
        await adminProfileApi.updateAuthScreenMedia(screen, editingVideoId, {
          file: selectedMedia.uploadFile,
        });
      } else {
        const createdMedia = await adminProfileApi.createAuthScreenMedia(
          screen,
          selectedMedia.uploadFile,
        );
        if (createdMedia.isActive) {
          await Promise.all(
            videos
              .filter((media) => media.isActive)
              .map((media) =>
                adminProfileApi.updateAuthScreenMedia(screen, media.id, {
                  isActive: false,
                }),
              ),
          );
        }
      }
      closeEditor();
      setSelectedMedia(null);
      await loadMedia(true);
    } catch (error) {
      await loadMedia(true);
      Alert.alert(
        `Unable to save ${title.toLowerCase()}`,
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  const activateMedia = async (media: AuthScreenVideo) => {
    if (media.isActive || pendingMediaId) return;

    setPendingMediaId(media.id);
    try {
      await adminProfileApi.updateAuthScreenMedia(screen, media.id, {
        isActive: true,
      });
      await Promise.all(
        videos
          .filter((item) => item.id !== media.id && item.isActive)
          .map((item) =>
            adminProfileApi.updateAuthScreenMedia(screen, item.id, {
              isActive: false,
            }),
          ),
      );
      activateAuthScreenVideo(screen, media.id);
      await loadMedia(true);
    } catch (error) {
      Alert.alert(
        "Unable to activate media",
        error instanceof Error ? error.message : "Please try again.",
      );
      await loadMedia(true);
    } finally {
      setPendingMediaId(null);
    }
  };

  const deleteMedia = (media: AuthScreenVideo) => {
    Alert.alert("Delete media?", `Remove "${media.fileName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await adminProfileApi.deleteAuthScreenMedia(screen, media.id);
            await loadMedia(true);
          } catch (error) {
            Alert.alert(
              "Unable to delete media",
              error instanceof Error ? error.message : "Please try again.",
            );
          }
        },
      },
    ]);
  };

  const formatDuration = (durationMs: number | null) => {
    if (durationMs === null) return "";
    const seconds = Math.round(durationMs / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}
    >
      <View
        className="flex-row items-center border-b px-4 py-4 shadow-sm"
        style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}
      >
        <Pressable
          onPress={() => router.back()}
          className="mr-4 p-1"
          hitSlop={15}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text
          className="flex-1 text-xl font-black"
          style={{ color: theme.text }}
        >
          {title}
        </Text>
        <Pressable
          onPress={() => openEditor()}
          disabled={loading || saving}
          className="rounded-xl px-3 py-2"
          style={{
            backgroundColor: theme.primary,
            opacity: loading || saving ? 0.6 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel={`Add ${title.toLowerCase()} media`}
        >
          <Text className="text-xs font-bold text-white">+ Add</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadMedia(true)}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {loading ? (
          <View className="items-center py-10">
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : videos.length === 0 ? (
          <Card variant="default" className="items-center rounded-2xl p-8">
            <Feather
              name={screen === "splash" ? "video" : "image"}
              size={28}
              color={theme.muted}
            />
            <Text
              className="mt-3 text-center text-base font-semibold"
              style={{ color: theme.text }}
            >
              No media added
            </Text>
          </Card>
        ) : (
          videos.map((media) => (
            <Card
              key={media.id}
              variant="default"
              className="mb-3 flex-row items-center justify-between rounded-2xl p-4"
            >
              <Pressable
                className="mr-3 flex-1 flex-row items-center gap-3"
                onPress={() => void activateMedia(media)}
                disabled={Boolean(pendingMediaId)}
                accessibilityRole="radio"
                accessibilityState={{ selected: media.isActive }}
                accessibilityLabel={`Set ${media.fileName} as the active ${title.toLowerCase()} media`}
              >
                <View
                  className="h-6 w-6 items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: media.isActive ? theme.primary : theme.muted,
                  }}
                >
                  {pendingMediaId === media.id ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : media.isActive ? (
                    <View
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: theme.primary }}
                    />
                  ) : null}
                </View>
                <View className="flex-1">
                  <Text
                    className="text-base font-bold"
                    style={{
                      color: media.isActive ? theme.text : theme.muted,
                    }}
                    numberOfLines={1}
                  >
                    {media.fileName}
                  </Text>
                  <Text className="mt-1 text-xs" style={{ color: theme.muted }}>
                    {media.mediaType === "video" ? "Video" : "Image"}
                    {media.durationMs !== null
                      ? ` · ${formatDuration(media.durationMs)}`
                      : ""}
                    {media.isActive ? " · Active" : ""}
                  </Text>
                </View>
              </Pressable>
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => openEditor(media)}
                  hitSlop={10}
                  className="p-2"
                  accessibilityRole="button"
                  accessibilityLabel={`Replace ${media.fileName}`}
                >
                  <Feather name="edit-2" size={18} color={theme.primary} />
                </Pressable>
                <Pressable
                  onPress={() => deleteMedia(media)}
                  hitSlop={10}
                  className="p-2"
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${media.fileName}`}
                >
                  <Feather name="trash-2" size={18} color={theme.danger} />
                </Pressable>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {isEditorOpen ? (
        <View
          className="absolute inset-0 items-center justify-center px-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", paddingTop: insets.top }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ width: "100%", maxWidth: 420 }}
          >
            <Card
              variant="default"
              className="overflow-hidden rounded-3xl border-0 p-0 shadow-lg"
              style={{ maxHeight: "85%" }}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 24, paddingBottom: 28 }}
              >
                <View className="mb-5 flex-row items-center justify-between">
                  <Text
                    className="flex-1 text-xl font-black"
                    style={{ color: theme.text }}
                  >
                    {editingVideoId
                      ? `Edit ${title} media`
                      : `Add ${title} media`}
                  </Text>
                  <Pressable
                    onPress={closeEditor}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Close editor"
                  >
                    <Feather name="x" size={22} color={theme.muted} />
                  </Pressable>
                </View>

                <Text
                  className="mb-2 text-xs font-bold uppercase"
                  style={{ color: theme.muted }}
                >
                  {screen === "splash" ? "Video *" : "Image or video *"}
                </Text>
                {selectedMedia ? (
                  <>
                    <MediaPreview
                      key={selectedMedia.uri}
                      mediaType={selectedMedia.mediaType}
                      uri={selectedMedia.uri}
                    />
                    <Text
                      className="mb-3 mt-2 text-xs"
                      style={{ color: theme.muted }}
                      numberOfLines={1}
                    >
                      {selectedMedia.fileName}
                    </Text>
                  </>
                ) : (
                  <View
                    className="mb-3 h-40 items-center justify-center rounded-xl border border-dashed"
                    style={{
                      backgroundColor: theme.bg,
                      borderColor: theme.border,
                    }}
                  >
                    <Feather
                      name={screen === "splash" ? "video" : "image"}
                      size={28}
                      color={theme.muted}
                    />
                    <Text
                      className="mt-2 text-sm"
                      style={{ color: theme.muted }}
                    >
                      Choose media to preview
                    </Text>
                  </View>
                )}

                <Text className="mb-3 text-xs" style={{ color: theme.muted }}>
                  {screen === "splash"
                    ? "MP4, WEBM, or MOV · Maximum 50 MB"
                    : "JPEG, PNG, WEBP, MP4, WEBM, or MOV · Maximum 10 MB"}
                </Text>

                <Pressable
                  onPress={() => void chooseMedia()}
                  disabled={pickingMedia || saving}
                  className="mb-5 flex-row items-center justify-center gap-2 rounded-xl border p-3"
                  style={{ borderColor: theme.primary }}
                  accessibilityRole="button"
                >
                  {pickingMedia ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <Feather name="upload" size={18} color={theme.primary} />
                  )}
                  <Text
                    className="text-sm font-bold"
                    style={{ color: theme.primary }}
                  >
                    {pickingMedia
                      ? "Opening media library..."
                      : selectedMedia
                        ? "Choose another file"
                        : "Choose file"}
                  </Text>
                </Pressable>

                <Button
                  title={saving ? "Uploading..." : "Save"}
                  onPress={() => void saveMedia()}
                  loading={saving}
                  disabled={
                    !selectedMedia?.uploadFile || pickingMedia || saving
                  }
                />
                <Pressable
                  onPress={closeEditor}
                  className="mt-3 items-center py-2"
                >
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: theme.muted }}
                  >
                    Cancel
                  </Text>
                </Pressable>
              </ScrollView>
            </Card>
          </KeyboardAvoidingView>
        </View>
      ) : null}
    </View>
  );
}
