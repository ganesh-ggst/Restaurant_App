import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useRouter, useSegments } from "expo-router";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "../../../hooks/useAppTheme";
import { adminProfileApi } from "../../../services/api/admin-profile";
import { managerProfileApi } from "../../../services/api/manager-profile";
import {
  createAuthScreenMediaSection,
  getAuthScreenMediaState,
  getScreenMediaFileName,
  getScreenMediaType,
  subscribeToAuthScreenMedia,
  updateAuthScreenVideos,
} from "../../../services/auth-screen-media";
import { Card } from "../../ui/Card";
import {
  mapAdminStorefrontDisplay,
  type StoreDetailSection,
} from "../adminProfileSections";

export default function StorefrontDisplayIndexComponent() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const authScreenMedia = useSyncExternalStore(
    subscribeToAuthScreenMedia,
    getAuthScreenMediaState,
    getAuthScreenMediaState,
  );
  const isAdmin = segments[0] === "(admin)";
  const isFloor = segments[1] === "floor";

  const [displayItems, setDisplayItems] = useState<StoreDetailSection[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedManagerData = useRef(false);
  const adminDisplayItems = isAdmin
    ? [
        ...displayItems,
        createAuthScreenMediaSection("splash", authScreenMedia.splash),
        createAuthScreenMediaSection("login", authScreenMedia.login),
      ]
    : displayItems;

  const loadStorefrontDisplay = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const data = isAdmin
          ? await adminProfileApi.getStorefrontDisplay(isRefresh)
          : await managerProfileApi.getStorefrontDisplay();
        setDisplayItems(mapAdminStorefrontDisplay(data));
        if (isAdmin) {
          const [splash, login] = await Promise.all([
            adminProfileApi.getAuthScreenMedia("splash", isRefresh),
            adminProfileApi.getAuthScreenMedia("login", isRefresh),
          ]);
          updateAuthScreenVideos(
            "splash",
            splash.map((media) => ({
              id: media.id,
              title: media.title,
              uri: media.url,
              fileName: getScreenMediaFileName(media.url),
              mediaType: getScreenMediaType("splash", media.url),
              durationMs: null,
              isActive: media.isActive,
            })),
          );
          updateAuthScreenVideos(
            "login",
            login.map((media) => ({
              id: media.id,
              title: media.title,
              uri: media.url,
              fileName: getScreenMediaFileName(media.url),
              mediaType: getScreenMediaType("login", media.url),
              durationMs: null,
              isActive: media.isActive,
            })),
          );
        } else {
          hasLoadedManagerData.current = true;
        }
      } catch (error: unknown) {
        Alert.alert(
          "Unable to load storefront display",
          error instanceof Error ? error.message : "Please try again.",
        );
      } finally {
        setRefreshing(false);
      }
    },
    [isAdmin],
  );

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) {
        void loadStorefrontDisplay(true);
      } else if (!hasLoadedManagerData.current) {
        void loadStorefrontDisplay();
      }
    }, [isAdmin, loadStorefrontDisplay]),
  );

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.bg, paddingTop: insets.top }}
    >
      <View
        className="flex-row items-center px-4 py-4 border-b shadow-sm"
        style={{ backgroundColor: theme.card, borderBottomColor: theme.border }}
      >
        <Pressable
          onPress={() => router.back()}
          className="mr-4 p-1"
          hitSlop={15}
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <Text className="text-xl font-black" style={{ color: theme.text }}>
          Storefront Display
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadStorefrontDisplay(true)}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {adminDisplayItems.map((section) => {
          const activeOptions = section.options.filter((o) => o.isActive);
          let displayValue =
            "summary" in section ? section.summary : "None Active";
          if (!("summary" in section) && activeOptions.length > 0) {
            displayValue =
              section.selectionType === "single"
                ? activeOptions[0].value
                : `${activeOptions.length} Active`;
          }

          return (
            <Pressable
              key={section.id}
              onPress={() =>
                router.push(
                  `${isAdmin ? "/(admin)" : isFloor ? "/(manager)/floor" : "/(manager)/operations"}/profile/storefront-display/${section.id}` as any,
                )
              }
            >
              <Card
                variant="default"
                className="p-4 mb-3 rounded-2xl border-0 flex-row justify-between items-center"
              >
                <View className="flex-1 mr-3">
                  <Text
                    className="text-base font-bold mb-0.5"
                    style={{ color: theme.text }}
                  >
                    {section.title}
                  </Text>
                  <Text
                    className="text-xs font-medium"
                    style={{ color: theme.primary }}
                    numberOfLines={1}
                  >
                    {displayValue}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={theme.muted} />
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
