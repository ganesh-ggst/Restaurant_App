import {
  useFocusEffect,
  useRouter,
} from "expo-router";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  FileText,
  Globe,
  HelpCircle,
  LogOut,
  MessageSquare,
  Moon,
  Palette,
  Shield,
  Smartphone,
  Sparkles,
  Store,
  Sun,
  UserPlus,
  UserRound,
  UserRoundPen,
  X,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "../../hooks/useAppTheme";
import { useCurrentManager } from "../../hooks/useCurrentManager";
import {
  AdminProfile,
  adminProfileApi,
  getLocalAdminAvatarUri,
} from "../../services/api/admin-profile";
import { Card } from "../ui/Card";

interface ManagerProfileViewProps {
  role: "floor" | "operations" | "admin";
  title?: string;
}

const SettingsRow = ({
  icon: Icon,
  label,
  onPress,
  isLast = false,
  theme,
}: any) => (
  <Pressable
    onPress={onPress}
    className={`flex-row items-center justify-between py-4 ${!isLast ? "border-b" : ""}`}
    style={{ borderBottomColor: theme.border }}
  >
    <View className="flex-row items-center gap-4">
      <Icon size={22} color={theme.primary} strokeWidth={2} />
      <Text className="text-base font-semibold" style={{ color: theme.text }}>
        {label}
      </Text>
    </View>
    <ChevronRight size={20} color={theme.muted} strokeWidth={2} />
  </Pressable>
);

export default function ManagerProfileView({
  role = "operations",
  title = "Manager Profile",
}: ManagerProfileViewProps) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const currentThemeMode = (colorScheme as string) || "light";
  const router = useRouter();

  const theme = useAppTheme();
  const dangerColor =
    currentThemeMode === "dark" ? "hsl(7, 85%, 76%)" : "hsl(6, 74%, 54%)";

  const {
    currentManager,
    error: managerError,
    isAdmin,
    refreshCurrentManager,
  } = useCurrentManager();
  const phone = currentManager?.phone || "";
  const [showThemeModal, setShowThemeModal] = useState(false);
  const managerType = currentManager?.managerType?.trim().toLowerCase() || "";
  const isFloor = managerType
    ? managerType.includes("floor")
    : role === "floor";
  const managerProfilePath = isFloor
    ? "/(manager)/floor/profile"
    : "/(manager)/operations/profile";
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [adminAvatarUri, setAdminAvatarUri] = useState<string | null>(null);
  const [profileError, setProfileError] = useState("");

  useFocusEffect(
    useCallback(() => {
      if (!isAdmin) {
        return;
      }

      let isCurrent = true;
      adminProfileApi
        .getProfile()
        .then(({ admin }) => {
          if (isCurrent) {
            setAdminProfile(admin);
            setAdminAvatarUri(getLocalAdminAvatarUri(admin.id));
            setProfileError("");
          }
        })
        .catch((error: unknown) => {
          if (isCurrent) {
            setProfileError(
              error instanceof Error
                ? error.message
                : "Unable to load the admin profile.",
            );
          }
        });

      return () => {
        isCurrent = false;
      };
    }, [isAdmin]),
  );

  const matchedManager = isAdmin ? undefined : currentManager;

  const displayFirstName =
    (isAdmin
      ? adminProfile?.name ||
        [adminProfile?.firstName, adminProfile?.lastName]
          .filter(Boolean)
          .join(" ")
      : matchedManager?.name) ||
    (isAdmin
      ? "Admin Profile"
      : isFloor
        ? "Floor Manager"
        : "Operations Manager");

  const displayPhone = isAdmin
    ? adminProfile?.phone || phone
    : matchedManager?.phone || phone;
  const displayedAvatar = adminAvatarUri || adminProfile?.avatarUrl;
  const [refreshing, setRefreshing] = useState(false);

  const refreshProfile = async () => {
    setRefreshing(true);
    try {
      await refreshCurrentManager();
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => router.replace("/(auth)/login" as any),
      },
    ]);
  };

  const handleComingSoon = (featureName: string) => {
    Alert.alert(
      "Coming Soon",
      `${featureName} is currently under development.`,
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        refreshControl={
          !isAdmin ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refreshProfile()}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          ) : undefined
        }
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: 10,
          paddingBottom: 160,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center mb-10 px-6">
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-5 border-[2px]"
            style={{ backgroundColor: theme.bg, borderColor: theme.primary }}
          >
            {isAdmin && displayedAvatar ? (
              <Image
                source={{ uri: displayedAvatar }}
                className="w-full h-full rounded-full"
                resizeMode="cover"
              />
            ) : (
              <UserRound size={40} color={theme.primary} strokeWidth={1.5} />
            )}
          </View>
          <Text
            className="text-2xl font-black mb-1"
            style={{ color: theme.text }}
            numberOfLines={1}
          >
            {displayFirstName}
          </Text>
          <View style={{ minHeight: 20, justifyContent: "center" }}>
            {displayPhone ? (
              <Text
                className="text-sm font-semibold tracking-wide"
                style={{ color: theme.muted }}
              >
                {displayPhone}
              </Text>
            ) : null}
          </View>
          {isAdmin && profileError ? (
            <Text
              className="text-xs text-center mt-2"
              style={{ color: theme.danger }}
            >
              {profileError}
            </Text>
          ) : null}
          {!isAdmin && managerError ? (
            <Text
              className="text-xs text-center mt-2"
              style={{ color: theme.danger }}
            >
              {managerError}
            </Text>
          ) : null}
        </View>

        <View className="px-5 gap-6">
          <Card variant="default" className="p-4 rounded-3xl border-0">
            {role !== "admin" ? (
              <SettingsRow
                icon={UserRoundPen}
                label="Personal Info"
                onPress={() => {
                  const targetQuery = displayPhone
                    ? `?phone=${encodeURIComponent(displayPhone)}`
                    : phone
                      ? `?phone=${encodeURIComponent(phone)}`
                      : "";
                  router.push(
                    `${managerProfilePath}/personal${targetQuery}` as any,
                  );
                }}
                theme={theme}
              />
            ) : (
              <SettingsRow
                icon={UserRoundPen}
                label="Personal Info"
                onPress={() => {
                  const targetQuery = displayPhone
                    ? `?phone=${encodeURIComponent(displayPhone)}`
                    : phone
                      ? `?phone=${encodeURIComponent(phone)}`
                      : "";
                  router.push(
                    `/(admin)/profile/personal${targetQuery}` as any,
                  );
                }}
                theme={theme}
              />
            )}

            <SettingsRow
              icon={Store}
              label="Store Details"
              onPress={() =>
                router.push(
                  (isAdmin
                    ? "/(admin)/profile/store-details"
                    : `${managerProfilePath}/store-details`) as any,
                )
              }
              theme={theme}
            />

            <SettingsRow
              icon={Sparkles}
              label="Storefront Display"
              onPress={() =>
                router.push(
                  (isAdmin
                    ? "/(admin)/profile/storefront-display"
                    : `${managerProfilePath}/storefront-display`) as any,
                )
              }
              theme={theme}
            />

            <SettingsRow
              icon={Shield}
              label="Security & Access"
              onPress={() => {
                const targetQuery = phone
                  ? `?phone=${encodeURIComponent(phone)}`
                  : "";
                if (isAdmin) {
                  router.push(`/(admin)/profile/security${targetQuery}` as any);
                } else {
                  router.push(
                    `${managerProfilePath}/security${targetQuery}` as any,
                  );
                }
              }}
              theme={theme}
            />

            {isAdmin && (
              <SettingsRow
                icon={Shield}
                label="Add Admin"
                onPress={() => {
                  const targetQuery = displayPhone
                    ? `?phone=${encodeURIComponent(displayPhone)}`
                    : phone
                      ? `?phone=${encodeURIComponent(phone)}`
                      : "";
                  router.push(
                    `/(admin)/profile/add-admin${targetQuery}` as any,
                  );
                }}
                theme={theme}
              />
            )}

            <SettingsRow
              icon={UserPlus}
              label="Add New Manager"
              onPress={() => {
                const targetQuery = displayPhone
                  ? `?phone=${encodeURIComponent(displayPhone)}`
                  : phone
                    ? `?phone=${encodeURIComponent(phone)}`
                    : "";
                if (isAdmin) {
                  router.push(
                    `/(admin)/profile/add-manager${targetQuery}` as any,
                  );
                } else {
                  router.push(
                    `${managerProfilePath}/add-manager${targetQuery}` as any,
                  );
                }
              }}
              theme={theme}
            />

            <SettingsRow
              icon={UserPlus}
              label="Add Waiter"
              onPress={() => {
                const targetQuery = displayPhone
                  ? `?phone=${encodeURIComponent(displayPhone)}`
                  : phone
                    ? `?phone=${encodeURIComponent(phone)}`
                    : "";
                if (isAdmin) {
                  router.push(
                    `/(admin)/profile/add-waiter${targetQuery}` as any,
                  );
                } else {
                  router.push(
                    `${managerProfilePath}/add-waiter${targetQuery}` as any,
                  );
                }
              }}
              theme={theme}
            />

            {isAdmin && (
              <SettingsRow
                icon={Store}
                label="Manage Tables"
                onPress={() => router.push("/(admin)/profile/tables" as any)}
                theme={theme}
              />
            )}

            <SettingsRow
              icon={Bell}
              label="Notifications"
              onPress={() => {
                const targetQuery = phone
                  ? `?phone=${encodeURIComponent(phone)}`
                  : "";
                if (isAdmin) {
                  router.push(
                    `/(admin)/profile/notifications${targetQuery}` as any,
                  );
                } else {
                  router.push(
                    `${managerProfilePath}/notifications${targetQuery}` as any,
                  );
                }
              }}
              isLast
              theme={theme}
            />
          </Card>

          <Card variant="default" className="p-4 rounded-3xl border-0">
            <SettingsRow
              icon={Palette}
              label="Theme & Appearance"
              onPress={() => setShowThemeModal(true)}
              theme={theme}
            />
            <SettingsRow
              icon={Globe}
              label="Language"
              onPress={() => handleComingSoon("Language Selection")}
              isLast
              theme={theme}
            />
          </Card>

          <Card variant="default" className="p-4 rounded-3xl border-0">
            <SettingsRow
              icon={HelpCircle}
              label="Help Center"
              onPress={() => handleComingSoon("Help Center")}
              theme={theme}
            />
            <SettingsRow
              icon={MessageSquare}
              label="Contact Support"
              onPress={() => handleComingSoon("Contact Support")}
              theme={theme}
            />
            <SettingsRow
              icon={FileText}
              label="Privacy Policy"
              onPress={() => handleComingSoon("Privacy Policy")}
              isLast
              theme={theme}
            />
          </Card>

          <Pressable
            onPress={handleLogout}
            className="flex-row items-center justify-center gap-3 p-4 rounded-2xl border shadow-sm mt-4"
            style={{
              backgroundColor:
                currentThemeMode === "dark"
                  ? "rgba(220, 38, 38, 0.08)"
                  : "rgba(220, 38, 38, 0.04)",
              borderColor: dangerColor,
            }}
          >
            <LogOut size={20} color={dangerColor} strokeWidth={2.5} />
            <Text
              className="text-base font-bold"
              style={{ color: dangerColor }}
            >
              Sign Out
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Theme Modal */}
      <Modal
        visible={showThemeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <Pressable
            className="flex-1"
            onPress={() => setShowThemeModal(false)}
          />
          <View
            className="rounded-t-[32px] p-6 pb-12"
            style={{ backgroundColor: theme.bg, maxHeight: "80%" }}
          >
            <View className="flex-row items-center justify-between mb-6">
              <Text
                className="text-xl font-black tracking-tight"
                style={{ color: theme.text }}
              >
                Choose Theme
              </Text>
              <Pressable
                onPress={() => setShowThemeModal(false)}
                className="p-2"
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <X size={24} color={theme.text} />
              </Pressable>
            </View>
            <View className="gap-3">
              <Pressable
                onPress={() => {
                  setColorScheme("light");
                  setShowThemeModal(false);
                }}
                className="flex-row items-center p-4 rounded-2xl border"
                style={{
                  backgroundColor: theme.card,
                  borderColor:
                    currentThemeMode === "light" ? theme.primary : theme.border,
                }}
              >
                <Sun
                  size={24}
                  color={
                    currentThemeMode === "light" ? theme.primary : theme.muted
                  }
                />
                <View className="ml-4 flex-1">
                  <Text
                    className="text-base font-bold"
                    style={{ color: theme.text }}
                  >
                    Light Mode
                  </Text>
                </View>
                {currentThemeMode === "light" && (
                  <CheckCircle2 size={24} color={theme.primary} />
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  setColorScheme("dark");
                  setShowThemeModal(false);
                }}
                className="flex-row items-center p-4 rounded-2xl border"
                style={{
                  backgroundColor: theme.card,
                  borderColor:
                    currentThemeMode === "dark" ? theme.primary : theme.border,
                }}
              >
                <Moon
                  size={24}
                  color={
                    currentThemeMode === "dark" ? theme.primary : theme.muted
                  }
                />
                <View className="ml-4 flex-1">
                  <Text
                    className="text-base font-bold"
                    style={{ color: theme.text }}
                  >
                    Dark Mode
                  </Text>
                </View>
                {currentThemeMode === "dark" && (
                  <CheckCircle2 size={24} color={theme.primary} />
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  setColorScheme("system");
                  setShowThemeModal(false);
                }}
                className="flex-row items-center p-4 rounded-2xl border"
                style={{
                  backgroundColor: theme.card,
                  borderColor:
                    currentThemeMode === "system"
                      ? theme.primary
                      : theme.border,
                }}
              >
                <Smartphone
                  size={24}
                  color={
                    currentThemeMode === "system" ? theme.primary : theme.muted
                  }
                />
                <View className="ml-4 flex-1">
                  <Text
                    className="text-base font-bold"
                    style={{ color: theme.text }}
                  >
                    System Default
                  </Text>
                </View>
                {currentThemeMode === "system" && (
                  <CheckCircle2 size={24} color={theme.primary} />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
